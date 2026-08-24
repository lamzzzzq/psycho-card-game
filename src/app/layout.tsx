import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif_TC, Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { LocaleSync } from "@/components/shared/LocaleSync";
import { SessionGuard } from "@/components/shared/SessionGuard";
import { BgmPlayer } from "@/components/shared/BgmPlayer";
import { AssessmentSync } from "@/components/shared/AssessmentSync";
import { HexacoSync } from "@/components/shared/HexacoSync";
import { Sd4Sync } from "@/components/shared/Sd4Sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ⚠️ 用繁體 TC 字型（Noto Serif/Sans TC），非簡體 SC：
// UI 文字是繁體，若用 SC 字型檔渲染，標點（，。、）會沉到左下角（簡體排版規範），
// 港台使用者一眼看出「簡轉繁」廉價感。TC 字型的標點嚴格居中，符合港台規範。
const notoSerifTc = Noto_Serif_TC({
  variable: "--font-serif-cn",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// 非衬线中文（原型用：card-lab/palette 字体探索）。仅暴露 CSS 变量，不改现状。
const notoSansTc = Noto_Sans_TC({
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
      lang="zh-HK"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifTc.variable} ${notoSansTc.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--psy-bg)] text-[var(--psy-ink)]">
        <LocaleSync />
        <SessionGuard />
        <AssessmentSync />
        <HexacoSync />
        <Sd4Sync />
        {children}
        <BgmPlayer />
      </body>
    </html>
  );
}
