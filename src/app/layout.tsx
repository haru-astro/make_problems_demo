import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "作問カンバン | 4択問題の共同作成ボード",
  description:
    "アイデア出しから問題作成・レビュー・完成まで、4択問題づくりをチームで管理するカンバンボード",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex h-full min-h-full flex-col">{children}</body>
    </html>
  );
}
