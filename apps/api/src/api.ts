import * as Cloudflare from "alchemy/Cloudflare";
import { Effect, Layer } from "effect";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";

import { connectDatabase, Database } from "./database";
import { ApiRpcs } from "./rpcs";
import { TaskRpcsLive } from "./tasks/live";

/** Cloudflare RPC Worker hosting the API's resource groups. */
export default class Api extends Cloudflare.RpcWorker<Api>()(
  "Api",
  {
    main: import.meta.url,
    compatibility: {
      flags: ["nodejs_compat"],
    },
    schema: ApiRpcs,
  },
  Effect.gen(function* () {
    const db = yield* connectDatabase;
    const handlers = TaskRpcsLive.pipe(Layer.provide(Layer.succeed(Database, db)));

    return RpcServer.toHttpEffect(ApiRpcs).pipe(
      Effect.provide(Layer.mergeAll(handlers, RpcSerialization.layerNdjson)),
    );
  }),
) {}
