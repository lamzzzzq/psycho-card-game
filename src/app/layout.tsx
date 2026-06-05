import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifSc = Noto_Serif_SC({
  variable: "--font-serif-cn",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PsychoCardGame - 心理卡牌對戰",
  description: "基於 Big Five 人格測評的心理學卡牌遊戲",
};

// 缺 viewport meta 时手机会按桌面宽度(~980px)缩放 → 显示不全 + 可左右平移。
// 显式声明确保移动端 full-width；viewportFit:cover 配合 safe-area 底栏。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifSc.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[var(--psy-bg)] text-[var(--psy-ink)]">
        {children}
      </body>
    </html>
  );
}
