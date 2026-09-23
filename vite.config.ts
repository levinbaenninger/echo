import foldkitLint from "@foldkit/oxlint-plugin/recommended.json" with { type: "json" };
import { recommended as effectLint } from "@effect/tsgo/oxlint-presets";
import { defineConfig } from "vite-plus";
import type { OxlintConfig } from "vite-plus/lint";

// SAFETY: @foldkit/oxlint-plugin publishes recommended.json as an Oxlint config; JSON imports only widen its severity literals to string.
const foldkit = foldkitLint as OxlintConfig;

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: [
      "repos/**",
      "apps/web/repos",
      "apps/web/**/*.tsbuildinfo",
      ".agents/**",
      ".claude/**",
      "tools/oxlint/anti-slop/**",
    ],
    overrides: [
      {
        files: ["apps/web/**"],
        options: {
          arrowParens: "avoid",
          printWidth: 80,
          semi: false,
          singleQuote: true,
          sortImports: {
            customGroups: [{ groupName: "scoped", elementNamePattern: ["@*", "@*/**"] }],
            groups: [["builtin", "external"], "scoped", ["parent", "sibling", "index"], "unknown"],
            ignoreCase: false,
          },
          trailingComma: "all",
        },
      },
    ],
  },
  lint: {
    extends: [effectLint],
    ignorePatterns: [
      "repos/**",
      "apps/web/dist",
      "apps/web/repos",
      "apps/web/**/*.d.ts",
      "apps/web/vite.config.ts",
      ".agents/**",
      ".claude/**",
      "tools/oxlint/anti-slop/**",
    ],
    jsPlugins: [
      ...(foldkit.jsPlugins ?? []),
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
      { name: "anti-slop", specifier: "./tools/oxlint/anti-slop/index.ts" },
      { name: "anti-slop-effect", specifier: "./tools/oxlint/anti-slop/effect/index.ts" },
    ],
    options: { typeAware: true, typeCheck: true },
    rules: {
      "vite-plus/prefer-vite-plus-imports": "error",
      "oxc/no-accumulating-spread": "error",
      "anti-slop/no-array-filter-map": "error",
      "anti-slop/no-reduce-accumulator-copy": "error",
      "anti-slop/no-chained-type-assertions": "error",
      "anti-slop/no-conditional-empty-object-spread": "error",
      "anti-slop/no-known-value-widening": "error",
      "anti-slop/no-module-mocking": "error",
      "anti-slop/no-object-parameters": "error",
      "anti-slop/no-reflect-apply": "error",
      "anti-slop/no-reflect-get": "error",
      "anti-slop/no-runtime-typeof": "error",
      "anti-slop/no-shape-in-symbol-names": "error",
      "anti-slop/no-unknown-parameters": "error",
      "anti-slop/no-unknown-returns": "error",
      "anti-slop/no-unknown-type-aliases": "error",
      "anti-slop/no-unsafe-dictionary-type": "error",
      "anti-slop/no-widen-then-assert": "error",
      "anti-slop/require-readable-spacing": "error",
      "anti-slop/require-safety-comment-for-type-assertion": "error",
      "anti-slop-effect/no-manual-effect-error-tag": "error",
      "anti-slop-effect/no-manual-tag-comparison": "error",
      "anti-slop-effect/no-manual-tagged-construction": "error",
      "anti-slop-effect/no-service-constructor-imports": "error",
      "anti-slop-effect/prefer-effect-match": "error",
    },
    overrides: [
      {
        files: ["apps/web/**"],
        rules: {
          ...foldkit.rules,
          "no-unused-vars": [
            "error",
            {
              argsIgnorePattern: "^_",
              caughtErrorsIgnorePattern: "^_",
              destructuredArrayIgnorePattern: "^_",
              varsIgnorePattern: "^_",
            },
          ],
          "sort-imports": ["error", { ignoreCase: false, ignoreDeclarationSort: true }],
          "typescript/consistent-type-assertions": ["error", { assertionStyle: "never" }],
          "typescript/no-explicit-any": "error",
        },
      },
      // Foldkit's preset overrides use `**/` globs; scope them to the web app so they don't hit other packages.
      ...(foldkit.overrides ?? []).map((override) => ({
        ...override,
        files: override.files.map((glob) => `apps/web/${glob}`),
        excludeFiles: override.excludeFiles?.map((glob) => `apps/web/${glob}`),
      })),
    ],
  },
  run: {
    cache: true,
  },
});
