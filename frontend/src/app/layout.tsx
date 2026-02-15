import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "RaptorX - AI Access Control",
  description: "AI-Powered Contextual Access Control System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0f172a] text-slate-100 overflow-hidden">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
