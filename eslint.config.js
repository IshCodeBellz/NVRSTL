// ESLint flat config with custom rule to forbid toFixed(2) directly on price-like identifiers.
const typescriptEslint = require("@typescript-eslint/eslint-plugin");
const typescriptParser = require("@typescript-eslint/parser");
const nextPlugin = require("@next/eslint-plugin-next");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "coverage/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        exports: "readonly",
        global: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      // Disallow calling toFixed(2) on price/amount/total identifiers directly; enforce centralized formatter usage.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name='toFixed'][arguments.length=1][arguments.0.value=2] > MemberExpression.callee > MemberExpression.object.property[name=/^(price|subtotal|total|amount)$/i]",
          message:
            "Do not format prices with toFixed(2) directly on price/subtotal/total/amount. Use formatPriceCents() with integer cents instead.",
        },
      ],
      // Basic ESLint rules
      "no-unused-vars": "warn",
      "no-console": "warn",
      "prefer-const": "warn",

      // TypeScript rules - relaxed for better development experience
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",

      // Next.js rules
      "@next/next/no-img-element": "warn",

      // React hooks rules
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // Relax rule only for shim/demo files and shipping services
  {
    files: ["lib/server/*_clean.ts", "lib/server/shipping/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
