import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dinner Decider",
  description: "帮家庭更快决定今晚吃什么、做什么。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
