import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "RaptorX - AI Access Control",
  description: "AI-Powered Contextual Access Control System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="overflow-hidden">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
