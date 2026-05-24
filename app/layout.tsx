import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Briefly",
  description: "A productivity copilot with meeting notes, task breakdown, and reply drafting powered by Pollinations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en" className="h-full antialiased">
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
