import eslint from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

/** Mirrors legacy .eslintrc.cjs: eslint:recommended + TS parser; unused vars off. */
export default [
  {
    ignores: [
      "dist",
      "node_modules",
      "**/*.cjs",
      "coverage",
      "**/hardhat.config.js",
    ],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2020, sourceType: "module" },
      globals: globals.node,
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-useless-escape": "off",
    },
  },
];
