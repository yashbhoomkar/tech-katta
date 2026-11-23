import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dist-*", "node_modules", "test-results", "playwright-report"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // providers export their hook next to them (useContent): fine for fast refresh in practice
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  { files: ["scripts/**/*.mjs"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
);
