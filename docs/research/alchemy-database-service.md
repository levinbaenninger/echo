# Alchemy database access in a Cloudflare RPC Worker

Checked against Alchemy `2.0.0-beta.79`, the version pinned in `apps/api/package.json`, on 2026-09-19. This repo had no existing research-note directory, so this note lives under `docs/research`.

## What Alchemy shows

Alchemy's [full-stack RPC and Drizzle guide](https://alchemy.run/cloudflare/frontend/full-stack-tanstack-rpc-drizzle/) and its [first-party example](https://github.com/alchemy-run/alchemy/blob/main/examples/cloudflare-tanstack-rpc-drizzle/src/backend/api.ts) use this shape inside an `RpcWorker` constructor:

```ts
const conn = yield * Cloudflare.Hyperdrive.Connect(Hyperdrive);
const db = yield * Drizzle.Postgres(conn.connectionString);
const handlers = TodoRpcs.toLayer({
  listTodos: () => db.select().from(Todos).pipe(Effect.orDie),
});
return RpcServer.toHttpEffect(TodoRpcs).pipe(
  Effect.provide(Layer.mergeAll(handlers, RpcSerialization.layerJson)),
);
```

The constructor provides `Cloudflare.Hyperdrive.ConnectBinding`. The [Drizzle/Postgres guide](https://alchemy.run/sql/drizzle/postgres/) uses the same Hyperdrive-to-Drizzle setup for a plain Worker. Neither example adds an application `Database` tag around the Drizzle handle. That is the documented baseline, not a rule forbidding DI.

Calling `yield* Drizzle.Postgres(...)` in the constructor does **not** open a lasting database connection. It creates a deferred handle. The first query in each Worker event builds the pool; later queries in that event reuse it; the pool closes when the event settles. Alchemy says a pool shared across Cloudflare Worker requests is invalid because sockets belong to the request that created them. See [connection lifecycle](https://alchemy.run/sql/effect-sql/lifecycle/) and the installed `node_modules/alchemy/src/Drizzle/Postgres.ts` and `node_modules/alchemy/src/Runtime/ExecutionMemo.ts`.

## Is this repo's `Database` service good practice?

`apps/api/src/database.ts` defines an Effect `Context.Service` holding the Drizzle handle, and `apps/api/src/api.ts` provides it with `Layer.succeed`. That is ordinary Effect dependency injection. The handlers' `yield* Database` is valid, and the stored value is Alchemy's deferred handle, not a cross-request pool. This is an inference from the installed implementation and [Alchemy's layer guidance](https://alchemy.run/infrastructure-as-effects/layers/), not a specific Alchemy recommendation to tag every Drizzle client.

For this API, the simpler documented option is to create the handle once in `api.ts` and pass it to a task-handler layer factory, which can keep the `TaskRpcs.toLayer({...})` object together in `tasks/handlers.ts`. The `db` parameter is then explicit composition, not a new connection per call. Prefer the `Database` tag if independent handlers or tests need to supply a different database handle through Effect context. If the goal is to hide persistence, a higher-level `TaskStore` or `TaskService` contract would be a stronger seam than a tag exposing raw Drizzle. Alchemy's [Layers guide](https://alchemy.run/infrastructure-as-effects/layers/) demonstrates that kind of application service with a swappable storage implementation. This recommendation is architectural judgment, not an Alchemy-mandated pattern.

Alchemy's [Effect SQL/Postgres service section](https://alchemy.run/sql/effect-sql/postgres/) documents `SQL.PostgresLayer` for database-agnostic code that yields the generic `SqlClient.SqlClient` tag. It also provides `PgClient` for code that needs the Postgres driver, including Drizzle's Effect driver. This is a different assembly route from the direct `Drizzle.Postgres` convenience call shown in the RPC example. The installed `node_modules/alchemy/src/SQL/Postgres.ts` has the matching layer implementation.

## Version and configuration notes

- The linked website and GitHub example track current Alchemy and can move independently of `2.0.0-beta.79`. The key APIs and lazy per-event implementation above were checked in this repo's installed package.
- This repo already uses `origin: branch.origin` and `dev: branch.pooledOrigin` in `packages/db/src/db.ts`. That matches Alchemy's [Neon guidance](https://alchemy.run/neon/data/connections/): Hyperdrive pools the direct origin in production, while local development bypasses Hyperdrive and uses Neon's pooled origin.
- Alchemy's RPC guide [disables Hyperdrive query caching](https://alchemy.run/cloudflare/frontend/full-stack-tanstack-rpc-drizzle/) for a write-then-read todo app because Hyperdrive caches reads by default. This repo does not set `caching`, so check the desired consistency before relying on immediate visibility after task writes.
