import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // O padrão de 1 MB é apertado para o envio da planilha de importação.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
