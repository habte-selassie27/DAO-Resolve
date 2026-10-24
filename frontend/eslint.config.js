import pluginVue from "eslint-plugin-vue";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "test-results/**", "playwright-report/**"],
  },
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.{js,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/no-undef-properties": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
