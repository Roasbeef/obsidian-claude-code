import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import vitestPlugin from "eslint-plugin-vitest";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // TypeScript rules - relaxed for existing codebase.
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-require-imports": "off",

      // Import organization - off for now, can enable later.
      "import/order": "off",
      "import/no-duplicates": "off",

      // General quality - relaxed.
      "no-console": "off",
      eqeqeq: "off",
      curly: "off",
      "prefer-const": "off",
    },
  },
  {
    // Test files configuration - use separate parser settings.
    files: ["tests/**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...vitestPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    ignores: [
      "main.js",
      "*.mjs",
      "node_modules/",
      "coverage/",
      "dist/",
      "*.config.js",
      "*.config.ts",
    ],
  }
);
