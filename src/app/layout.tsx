import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";
import { BuIconDefs } from "@/components/BuIcon";

export const metadata: Metadata = {
  title: "ByteUP BOT",
  description:
    "Bot Discord completo para tickets, moderação, logs, automoderação, economia, níveis e painel web.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <BuIconDefs />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
