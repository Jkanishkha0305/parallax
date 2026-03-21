import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parallax — AI Persona UX Testing",
  description: "AI persona agents that navigate your product and report real friction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-white font-sans">
        {children}
      </body>
    </html>
  );
}
