import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import i18nGuard from "./scripts/eslint-plugin-i18n-guard.js";

export default [
  // Test files — declare Vitest globals so linters don't flag describe/test/expect/etc.
  {
    files: [
      "src/components/**/__tests__/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/__tests__/**/*.{js,mjs,cjs,jsx}",
      "src/components/**/*.test.{js,mjs,cjs,jsx}",
      "src/pages/**/*.test.{js,mjs,cjs,jsx}",
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.vitest,
      },
    },
  },
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
      // i18n guard: warns when new hardcoded user-facing strings are added.
      // Fix: wrap with t("namespace.key") and add the key to en.ui.jsx.
      // See docs/i18n-check.md for the full workflow.
      "i18n-guard": i18nGuard,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      // i18n: warn on hardcoded user-facing text in JSX and user-facing attributes.
      // These are warnings (not errors) so existing violations don't block the build.
      // New files should have zero violations — see docs/i18n-check.md.
      "i18n-guard/no-hardcoded-text": "warn",
      "i18n-guard/no-hardcoded-attr-string": "warn",
    },
  },
  // i18n locale files — exclude from hardcoded-string rules since they
  // intentionally contain raw English strings as translation values.
  {
    files: [
      "src/components/i18n/**/*.{js,jsx}",
      "src/components/i18n/locales/**/*.{js,jsx}",
    ],
    rules: {
      "i18n-guard/no-hardcoded-text": "off",
      "i18n-guard/no-hardcoded-attr-string": "off",
    },
  },
];
