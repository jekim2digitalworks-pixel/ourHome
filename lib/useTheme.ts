"use client";

import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

/**
 * 테마 상태 + <html> 클래스/localStorage 동기화.
 * 기본값은 다크. 라이트는 globals.css 의 `html.light` 리매핑으로 색이 적용된다.
 * 초기 클래스는 app/layout.tsx 의 인라인 스크립트가 페인트 전에 선반영(FOUC 방지).
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setThemeState(stored === "light" ? "light" : "dark");
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode 등 — 무시 */
    }
    const el = document.documentElement;
    el.classList.remove("dark", "light");
    el.classList.add(next);
    el.style.colorScheme = next;
  };

  return { theme, setTheme };
}
