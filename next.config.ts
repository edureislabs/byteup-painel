import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o embaralhador do código dos bots roda no servidor
  serverExternalPackages: ["javascript-obfuscator"],
  /* config options here */
};

export default nextConfig;
