"use client";

import { useEffect } from "react";

// When /curio?q=… is opened (e.g. from "Explain this indicator"), place the question in the input.
export function CurioPrefill({ question }: { question: string }) {
  useEffect(() => {
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Your question"]');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, question);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }, [question]);
  return null;
}
