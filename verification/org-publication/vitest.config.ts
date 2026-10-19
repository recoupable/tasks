import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["verification/org-publication/*.probe.ts"] },
});
