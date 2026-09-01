import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Apenas as regras de negocio: sao funcoes puras, sem banco e sem React.
    include: ["src/lib/**/*.test.ts"],
  },
});
