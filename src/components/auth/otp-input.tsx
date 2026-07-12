"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Saisie d'un code numérique à `length` chiffres sous forme de cases
 * individuelles (avance et recul automatiques du focus, collage du code
 * complet en une fois). Ne dépend d'aucune librairie externe.
 */
export function OtpInput({
  length,
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  length: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  function setDigit(index: number, digit: string) {
    const next = value.split("");
    while (next.length < length) next.push("");
    next[index] = digit;
    onChange(next.join("").slice(0, length));
  }

  function handleChange(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "");

    if (digits.length > 1) {
      // Collage d'un code complet (ou partiel) dans une case.
      const next = value.split("");
      while (next.length < length) next.push("");
      for (let i = 0; i < digits.length && index + i < length; i++) {
        next[index + i] = digits[i];
      }
      onChange(next.join("").slice(0, length));
      const lastFilled = Math.min(index + digits.length, length - 1);
      inputRefs.current[lastFilled]?.focus();
      return;
    }

    setDigit(index, digits);
    if (digits && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  return (
    <div className="flex justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={value[index] ?? ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          className={cn(
            "size-11 rounded-lg border border-input bg-transparent text-center text-lg font-semibold tabular-nums shadow-xs outline-none transition-colors sm:size-12",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        />
      ))}
    </div>
  );
}
