"use client";

import { useEffect, useState } from "react";

function current(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);
  useEffect(() => setMode(current()), []);
  function flip() {
    const next = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("vr-theme", next);
    } catch {}
    setMode(next);
  }
  return (
    <button className="iconbtn" onClick={flip} aria-label="Toggle light/dark theme">
      {mode === null ? "◐" : mode === "dark" ? "☀" : "☾"}
    </button>
  );
}
