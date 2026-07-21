import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { LocaleSync } from "@/components/shared/LocaleSync";

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

// 非衬线中文（原型用：card-lab/palette 字体探索）。仅暴露 CSS 变量，不改现状。
const notoSansSc = Noto_Sans_SC({
  variable: "--font-sans-cn",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const SITE_TITLE = "人格麻將 Personalities Mahjong";
const SITE_DESC = "基於人格測評的心理學卡牌遊戲";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESC,
  // 分享到微信/社交平台的预览卡片（标题+描述），与浏览器标签一致。
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESC,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESC,
  },
};

// 缺 viewport meta 时手机会按桌面宽度(~980px)缩放 → 显示不全 + 可左右平移。
// 显式声明确保移动端 full-width；viewportFit:cover 配合 safe-area 底栏。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4edd9", // = --psy-bg，让手机浏览器状态栏/工具栏与页面同色
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifSc.variable} ${notoSansSc.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--psy-bg)] text-[var(--psy-ink)]">
        <LocaleSync />
        {children}
      </body>
    </html>
  );
}
