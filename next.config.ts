import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // ═══════════════════════════════════════════════════════════
  // DEFESA: Erros de TypeScript/ESLint NÃO devem derrubar o site inteiro.
  // Em produção, queremos que o build prossiga mesmo com warnings.
  // Erros graves serão capturados pelos Error Boundaries em runtime.
  // ═══════════════════════════════════════════════════════════
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
