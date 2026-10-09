import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Youth Camp Programme | Gospel Of Truth Mission",
    template: "%s | GTM Youth Camp",
  },
  description:
    "Register for the Gospel Of Truth Mission (Lagos Ogun Badagry Branch) Youth Camp Programme.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
