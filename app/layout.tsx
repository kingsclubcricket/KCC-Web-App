import type { Metadata } from "next";
import "../styles.css";

export const metadata: Metadata = {
  title: "KCC Ground Admin",
  description: "Private operations portal for KCC Cricket Ground",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
