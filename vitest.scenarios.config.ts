import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Gerçek Gemini ile senaryo seti (§ 13). Normal `npm run test`'e dahil DEĞİL.
// Çalıştırma: GEMINI_API_KEY=... npm run senaryo
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./scenarios/server-only-stub.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["scenarios/**/*.scenario.ts"],
    testTimeout: 30 * 60 * 1000,
  },
});
