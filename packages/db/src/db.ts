import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Neon from "alchemy/Neon";
import { Effect } from "effect";

export const Db = Effect.gen(function* () {
  const schema = yield* Drizzle.Schema("schema", {
    schema: "./packages/db/src/schema.ts",
    out: "./packages/db/migrations",
  });

  const project = yield* Neon.Project("echo", {
    region: "aws-eu-central-1",
  });
  const branch = yield* Neon.Branch("main", {
    project,
    migrations: schema,
  });

  return { project, branch, schema };
});

export const Hyperdrive = Effect.gen(function* () {
  const { branch } = yield* Db;
  return yield* Cloudflare.Hyperdrive.Connection("hyperdrive", {
    origin: branch.origin,
    dev: branch.pooledOrigin,
  });
});
