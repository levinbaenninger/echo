import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle/Postgres";
import { Context, Effect } from "effect";

import { Hyperdrive } from "@echo/db";

/** The Alchemy Drizzle handle, available only to persistence adapters. */
export class Database extends Context.Service<
  Database,
  Effect.Success<ReturnType<typeof Drizzle.Postgres>>
>()("@echo/api/Database") {}

/** Binds Hyperdrive and acquires the shared database handle during Worker initialization. */
export const connectDatabase = Effect.gen(function* () {
  const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Hyperdrive);
  return yield* Drizzle.Postgres(hyperdrive.connectionString);
}).pipe(Effect.provide(Cloudflare.Hyperdrive.ConnectBinding));
