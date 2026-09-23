# anti-slop provenance

- Source: https://github.com/dmmulroy/anti-slop
- Commit: `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b` (2026-09-10)
- Copied from: `skills/install-anti-slop/assets/anti-slop` at that commit. It matches upstream `src/` without the `*.test.ts` files.
- Installed paths:
  - `tools/oxlint/anti-slop/index.ts` (generic plugin, `anti-slop`)
  - `tools/oxlint/anti-slop/effect/index.ts` (Effect plugin, `anti-slop-effect`)
- Install skill: `.agents/skills/install-anti-slop` (same commit). Use it for future updates.

The files in this directory have not been changed from upstream.

## Deviations from upstream defaults

- `@oxlint/plugins` is pinned at `1.81.0` through the pnpm catalog (upstream uses `1.78.0`) so it matches the `oxlint` version that `vite-plus` ships. Bump it together with `vite-plus`.
- The configuration lives in the root `vite.config.ts` under `lint` and `fmt`. There is no `oxlint.config.ts`.
- The Effect rule group is enabled because `apps/api`, `apps/web`, and `packages/db` depend on `effect` directly.
- Only `.agents/**` and `.claude/**` are ignored as agent tooling, because those are the only agent directories in this repository.
