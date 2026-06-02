import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our_Home · 우리 둘의 홈",
  description: "부부를 위한 캘린더 · 가계부 · 육아 · 사진첩 공동 관리 플랫폼",
};

export const viewport: Viewport = {
  themeColor: "#0b0c10",
  width: "device-width",
  initialScale: 1,
};

// 페인트 전에 테마 클래스를 선반영해 라이트/다크 깜빡임(FOUC)을 막는다. 기본 다크.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t='dark';}var e=document.documentElement;e.classList.add(t);e.style.colorScheme=t;}catch(_){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans selection:bg-accent/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
