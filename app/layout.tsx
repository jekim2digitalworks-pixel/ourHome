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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen font-sans selection:bg-accent/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
