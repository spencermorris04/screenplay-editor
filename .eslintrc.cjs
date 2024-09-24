/** @type {import("eslint").Linter.Config} */
const config = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": true
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    // TypeScript relaxed rules
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-base-to-string": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/consistent-indexed-object-style": "off",
    
    // General TypeScript rules - relaxed
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "warn",
    "@typescript-eslint/no-inferrable-types": "off",
    "@typescript-eslint/prefer-optional-chain": "warn",
    "@typescript-eslint/no-unnecessary-type-assertion": "off",
    
    // React rules - relaxed
    "react/no-unescaped-entities": "off",
    "react-hooks/exhaustive-deps": "warn",
    
    // General JavaScript rules - relaxed  
    "prefer-const": "warn",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-non-null-assertion": "off"
  }
}

module.exports = config;