import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: {
      js,
      prettier: prettierPlugin,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      ...prettierPlugin.configs.recommended.rules, // apply prettier recommended rules manually
      "prettier/prettier": "error", // highlight Prettier formatting issues as errors
    },
  },
  tseslint.configs.recommended,
]);
