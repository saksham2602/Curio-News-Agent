import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";

// ─────────────────────────────────────────────────────────────────────────────
// AI provider layer. Two providers:
//   • "nvidia"    — NVIDIA NIM (OpenAI-compatible, free developer tier). NVIDIA_API_KEY.
//   • "anthropic" — Claude via the official SDK. ANTHROPIC_API_KEY.
// Selection: AI_PROVIDER env, else whichever key is present (Anthropic first).
// ─────────────────────────────────────────────────────────────────────────────

export type Provider = "anthropic" | "nvidia" | null;

export function provider(): Provider {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (forced === "anthropic" && process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (forced === "nvidia" && process.env.NVIDIA_API_KEY?.trim()) return "nvidia";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (process.env.NVIDIA_API_KEY?.trim()) return "nvidia";
  return null;
}

export function isAiConfigured(): boolean {
  return provider() !== null;
}

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
export const NVIDIA_MODEL = process.env.NVIDIA_MODEL?.trim() || "nvidia/nemotron-3-ultra-550b-a55b";
export const NVIDIA_BASE_URL = (process.env.NVIDIA_BASE_URL?.trim() || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");

export function aiModelLabel(): string {
  const p = provider();
  return p === "anthropic" ? `Anthropic · ${ANTHROPIC_MODEL}` : p === "nvidia" ? `NVIDIA NIM · ${NVIDIA_MODEL}` : "not configured";
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("No AI provider is configured. Add NVIDIA_API_KEY (free developer key) or ANTHROPIC_API_KEY to .env and restart the server.");
    this.name = "AiNotConfiguredError";
  }
}

let _anthropic: Anthropic | null = null;
function anthropicClient(): Anthropic {
  _anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 180_000, maxRetries: 2 });
  return _anthropic;
}

// Stable editorial system prompt. Kept byte-identical across calls so it caches.
export const EDITORIAL_SYSTEM = `You are the editorial intelligence behind The Curious Brief, a personal news and knowledge platform for an intellectually curious young professional in India with a background in business, finance and strategy. She wants to understand the world deeply without being overwhelmed.

Your standards:
- Accuracy is non-negotiable. Use only the facts in the source material you are given. Never invent statistics, quotes, dates, names or links. If the sources do not establish something, say so plainly.
- Distinguish confirmed facts (from the sources) from analysis and interpretation (your reasoning). Mark uncertainty explicitly.
- Prioritise India's perspective while keeping a strong global view. Explain why things matter for the Indian economy, Indian businesses, financial markets, consumers, and global developments — but only the dimensions that genuinely apply.
- Help the reader think; never tell her what to think. Offer evidence, competing interpretations and good questions. Do not present artificially balanced sides when evidence clearly favours one reading.
- Explain fundamentals in plain, intelligent, conversational language without jargon or condescension.
- Tone: curious, warm, precise. Not childish, not corporate.
- Never produce sensational or clickbait phrasing.`;

export type Effort = "low" | "medium" | "high";

export interface StructuredOpts<S extends z.ZodType> {
  schema: S;
  user: string;
  system?: string;
  maxTokens?: number;
  effort?: Effort;
}

export async function generateStructured<S extends z.ZodType>(opts: StructuredOpts<S>): Promise<z.infer<S>> {
  const p = provider();
  if (p === "anthropic") return anthropicStructured(opts);
  if (p === "nvidia") return nvidiaStructured(opts);
  throw new AiNotConfiguredError();
}

export async function generateText(opts: { user: string; system?: string; maxTokens?: number; effort?: Effort }): Promise<string> {
  const p = provider();
  if (p === "anthropic") return anthropicText(opts);
  if (p === "nvidia") return nvidiaChat([{ role: "system", content: opts.system ?? EDITORIAL_SYSTEM }, { role: "user", content: opts.user }], opts.maxTokens ?? 2048, opts.effort !== "low");
  throw new AiNotConfiguredError();
}

// ───────────────────────────── Anthropic ─────────────────────────────

async function anthropicStructured<S extends z.ZodType>(opts: StructuredOpts<S>): Promise<z.infer<S>> {
  const res = await anthropicClient().beta.messages.parse({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 12000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: opts.system ?? EDITORIAL_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: opts.user }],
    output_config: { format: betaZodOutputFormat(opts.schema), effort: opts.effort ?? "medium" },
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined to answer this request.");
  if (res.stop_reason === "max_tokens") throw new Error("The response was cut off; try again.");
  if (!res.parsed_output) throw new Error("The model returned output that could not be parsed.");
  return res.parsed_output as z.infer<S>;
}

async function anthropicText(opts: { user: string; system?: string; maxTokens?: number; effort?: Effort }): Promise<string> {
  const res = await anthropicClient().beta.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: opts.system ?? EDITORIAL_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort ?? "medium" },
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined to answer this request.");
  return res.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// ───────────────────────────── NVIDIA NIM (OpenAI-compatible) ─────────────────────────────

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class NvidiaApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "NvidiaApiError";
  }
}

async function nvidiaChat(messages: ChatMessage[], maxTokens: number, thinking = true, attempt = 0): Promise<string> {
  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, Accept: "application/json" },
    // Nemotron-style reasoning toggle; ignored by models that do not support it.
    body: JSON.stringify({ model: NVIDIA_MODEL, messages, temperature: 0.25, top_p: 0.9, max_tokens: maxTokens, stream: false, chat_template_kwargs: { enable_thinking: thinking } }),
    signal: AbortSignal.timeout(180_000),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt < 3) {
      const retryAfter = Number(res.headers.get("retry-after"));
      await new Promise((r) => setTimeout(r, (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt * 3) * 1000));
      return nvidiaChat(messages, maxTokens, thinking, attempt + 1);
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new NvidiaApiError(res.status, `NVIDIA API ${res.status}: ${text.slice(0, 300) || res.statusText}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string | null; reasoning_content?: string | null }; finish_reason?: string }[] };
  const choice = json.choices?.[0];
  const content = (choice?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Reasoning models keep their thinking in `reasoning_content`; if they exhaust the budget
  // before answering, content is empty with finish_reason "length". Treat as truncation so the caller can retry.
  if (choice?.finish_reason === "length") throw new Error("__TRUNCATED__" + content);
  if (!content) throw new Error("NVIDIA API returned an empty response.");
  return content;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found in model output.");
  return body.slice(start, end + 1);
}

// Best-effort repair for common model slips (trailing commas, smart quotes outside strings).
function repairJson(s: string): string {
  return s.replace(/,\s*([}\]])/g, "$1").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
}

async function nvidiaStructured<S extends z.ZodType>(opts: StructuredOpts<S>): Promise<z.infer<S>> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(opts.schema, { target: "draft-7", unrepresentable: "any" }));
  const system = `${opts.system ?? EDITORIAL_SYSTEM}

OUTPUT FORMAT: Respond with a single JSON object only — no prose, no markdown fences, no comments. It must validate against this JSON Schema (field "description"s tell you what each field should contain; respect min/max item counts):
${jsonSchema}`;
  const maxTokens = Math.min(opts.maxTokens ?? 4096, 8192);
  const messages: ChatMessage[] = [
    { role: "system", content: system },
    { role: "user", content: opts.user },
  ];
  let lastError = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    let raw: string;
    try {
      raw = await nvidiaChat(messages, maxTokens, opts.effort !== "low");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("__TRUNCATED__")) {
        lastError = "The JSON was cut off before it finished";
        const partial = msg.slice("__TRUNCATED__".length);
        messages.push({ role: "assistant", content: partial || "(no answer produced)" }, { role: "user", content: partial ? "Your JSON was cut off before it was complete. Rewrite the ENTIRE JSON object more concisely (shorter strings, fewer optional items) so it fits. Output only the JSON object." : "You ran out of tokens before answering. Think briefly, then output only the JSON object, keeping strings concise." });
        continue;
      }
      throw e;
    }
    try {
      const parsed = JSON.parse(repairJson(extractJson(raw)));
      const result = opts.schema.safeParse(parsed);
      if (result.success) return result.data as z.infer<S>;
      lastError = result.error.issues.slice(0, 6).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    messages.push({ role: "assistant", content: raw }, { role: "user", content: `That JSON did not validate: ${lastError}. Return the corrected complete JSON object only.` });
  }
  throw new Error(`The model could not produce valid structured output after 3 attempts (${lastError}).`);
}

// ───────────────────────────── Errors ─────────────────────────────

export function describeAiError(e: unknown): string {
  if (e instanceof AiNotConfiguredError) return e.message;
  if (e instanceof NvidiaApiError) {
    if (e.status === 401 || e.status === 403) return "The NVIDIA API key was rejected. Check NVIDIA_API_KEY in .env.";
    if (e.status === 404) return `NVIDIA model "${NVIDIA_MODEL}" was not found. Set NVIDIA_MODEL to a model from build.nvidia.com.`;
    if (e.status === 429) return "The NVIDIA free tier is rate-limited right now. Please try again in a minute.";
    return e.message;
  }
  if (e instanceof Anthropic.AuthenticationError) return "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.";
  if (e instanceof Anthropic.RateLimitError) return "The AI service is rate-limited right now. Please try again in a moment.";
  if (e instanceof Anthropic.APIConnectionError) return "Could not reach the AI service. Check your network connection.";
  if (e instanceof Anthropic.APIError) return `AI service error (${e.status}): ${e.message}`;
  if (e instanceof Error) {
    if (e.name === "TimeoutError" || e.name === "AbortError") return "The AI request timed out. Please try again.";
    return e.message;
  }
  return "Unknown AI error.";
}
