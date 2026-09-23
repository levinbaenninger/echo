import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Neon from "alchemy/Neon";
import { DateTime, Effect } from "effect";

/** The stage that owns the Neon project. Preview stages (`pr-<number>`) add a branch to it instead of a project. */
const PRODUCTION_STAGE = "prod";

/** Neon deletes a preview branch this long after its last deploy, in case the PR cleanup job never runs. */
const PREVIEW_BRANCH_TTL = { days: 14 };

export const Db = Effect.gen(function* () {
  const { stage } = yield* Alchemy.Stack;

  const schema = yield* Drizzle.Schema("schema", {
    schema: "./packages/db/src/schema.ts",
    out: "./packages/db/migrations",
  });

  if (stage.startsWith("pr-")) {
    // Fails the plan with InvalidReferenceError until the prod stage has deployed.
    const project = yield* Neon.Project.ref("echo", { stage: PRODUCTION_STAGE });

    // Forks the project's default branch, which holds no data (prod lives in its own branch), so previews never
    // copy production rows and apply every migration from scratch. The expiry rounds to a day so redeploys within
    // a day plan no change.
    const expiresOn = DateTime.add(
      DateTime.startOf(yield* DateTime.now, "day"),
      PREVIEW_BRANCH_TTL,
    );

    const branch = yield* Neon.Branch("main", {
      project,
      migrations: schema,
      expiresAt: `${DateTime.formatIsoDate(expiresOn)}T00:00:00Z`,
    });

    return { project, branch, schema };
  }

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
