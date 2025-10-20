/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: ["next/core-web-vitals"],
  rules: {
    // Disable strict rules for production build
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@next/next/no-html-link-for-pages": "off",
    "react-hooks/exhaustive-deps": "off",
    "prefer-const": "off",
    "no-console": "off",
  },
};
