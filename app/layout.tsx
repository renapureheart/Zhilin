import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知林 · 我的知识森林",
  description: "记录学习足迹，看见知识之间的联系。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
