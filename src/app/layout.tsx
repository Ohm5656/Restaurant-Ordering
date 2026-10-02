import type { Metadata, Viewport } from "next";

import "@/index.css";

export const metadata: Metadata = {
  title: { default: "SAVOUR Restaurant OS", template: "%s | SAVOUR" },
  description: "ระบบสั่งอาหารผ่าน QR และจัดการโต๊ะสำหรับร้านอาหาร",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#122a25",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
