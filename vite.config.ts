import foldkitLint from "@foldkit/oxlint-plugin/recommended.json" with { type: "json" };
import { recommended as effectLint } from "@effect/tsgo/oxlint-presets";
import { defineConfig } from "vite-plus";
import type { OxlintConfig } from "vite-plus/lint";

const foldkitConfig = foldkitLint as OxlintConfig;
const inWebApp = (globs: Array<string>) => globs.map((glob) => `apps/web/${glob}`);

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    ignorePatterns: ["repos/**", "apps/web/repos", "apps/web/**/*.tsbuildinfo"],
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
    ],
    jsPlugins: [
      ...(foldkitConfig.jsPlugins ?? []),
      { name: "vite-plus", specifier: "vite-plus/oxlint-plugin" },
    ],
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        files: ["apps/web/**"],
        plugins: foldkitConfig.plugins,
        rules: {
          ...foldkitConfig.rules,
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
      ...(foldkitConfig.overrides ?? []).map(({ files, excludeFiles, ...override }) => ({
        ...override,
        files: inWebApp(files),
        ...(excludeFiles ? { excludeFiles: inWebApp(excludeFiles) } : {}),
      })),
    ],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
  },
  run: {
    cache: true,
  },
});
