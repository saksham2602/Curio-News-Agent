"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, signUpAction, type AuthState } from "@/app/actions";
import { GlobeNewspaper } from "@/components/doodles";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "signin" ? signInAction : signUpAction, undefined);
  const input = "mt-1 w-full rounded-full border border-line bg-paper/60 px-4 py-2.5 text-[14px] outline-none focus:border-ink/50";
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-6 sm:p-8">
        <GlobeNewspaper className="h-14 w-14" />
        <h1 className="display mt-3 text-[30px] font-medium">{mode === "signin" ? "Welcome back" : "Create your free account"}</h1>
        <p className="mt-1 text-[13.5px] text-muted">{mode === "signin" ? "Your saved stories, progress and notes on this device will be merged into your account." : "Keep your library, reading trail and perspectives across devices. Everything you've done as a guest comes with you."}</p>
        <form action={action} className="mt-6 space-y-4">
          {mode === "signup" && (
            <label className="block text-[13px] font-medium">
              Name <span className="font-normal text-muted">(optional)</span>
              <input name="name" className={input} autoComplete="name" />
            </label>
          )}
          <label className="block text-[13px] font-medium">
            Email
            <input name="email" type="email" required className={input} autoComplete="email" />
          </label>
          <label className="block text-[13px] font-medium">
            Password
            <input name="password" type="password" required minLength={8} className={input} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </label>
          {state?.error && <p className="rounded-xl bg-coral/40 px-3 py-2 text-[13px] dark:bg-coral/15">{state.error}</p>}
          <button type="submit" disabled={pending} className="w-full rounded-full bg-ink py-3 text-[14px] font-semibold text-paper disabled:opacity-60">
            {pending ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-center text-[13px] text-muted">
          {mode === "signin" ? (
            <>New here? <Link href="/signup" className="font-semibold text-rust">Create an account</Link></>
          ) : (
            <>Already have an account? <Link href="/signin" className="font-semibold text-rust">Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}
