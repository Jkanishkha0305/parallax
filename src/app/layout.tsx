import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parallax — AI UX Testing",
  description: "AI persona agents that navigate your product and report real friction in seconds",
  keywords: ["UX testing", "AI", "user research", "website analysis", "persona testing"],
  authors: [{ name: "Parallax" }],
  openGraph: {
    title: "Parallax — AI UX Testing",
    description: "AI persona agents that navigate your product and report real friction",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-[#030712] text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
