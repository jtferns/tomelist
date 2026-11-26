import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    ignorePatterns: [".design-sync/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  fmt: { printWidth: 120, ignorePatterns: ["data/**", "docs/**", ".design-sync/**"] },
});
