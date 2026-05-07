import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import { AIAssistantWidget } from "@/app/components/AIAssistantWidget";

export const metadata: Metadata = {
  title: "AI 辅助编程教育平台",
  description: "面向学生、教师和管理员的 AI 编程学习平台原型",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider>
            {children}
            <AIAssistantWidget />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
