# Echo

Disposable HTTP endpoints for testing integrations.

Create a URL, set what it responds with, call it from your app, and inspect the request your app sent. Change the response in the dashboard and the next call to the same URL gets the new behavior. It's handy for checking how a frontend handles slow responses, errors, or unexpected payloads.

Echo is a weekend project for learning [Effect](https://effect.website), [Foldkit](https://foldkit.dev), and [Alchemy](https://alchemy.run).

## Stack

- `apps/web`: the dashboard, built with Foldkit
- `apps/api`: the API, built with Effect and running on Cloudflare Workers
- `packages/db`: Postgres schema (Drizzle) on Neon
- `alchemy.run.ts`: infrastructure and deployment, defined in source with Alchemy

## Status

Early work in progress. See the [roadmap](docs/ROADMAP.md) for what's planned.

## Development

```bash
vp install      # install dependencies
vp run dev      # start the local stack (alchemy dev)
vp run ready    # check, test, and build everything
```
