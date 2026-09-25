import * as Cloudflare from "alchemy/Cloudflare";
import { Effect, Layer } from "effect";
import { HttpMiddleware } from "effect/unstable/http";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";

import { connectDatabase, Database } from "./database";
import { ApiRpcs } from "./rpc";
import { TaskRpcsLive } from "./tasks/rpc/layer";

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
  Effect.map(connectDatabase, (db) => {
    const handlers = TaskRpcsLive.pipe(Layer.provide(Layer.succeed(Database, db)));

    return RpcServer.toHttpEffect(ApiRpcs).pipe(
      // Any origin: the API has no auth or cookies yet, and pinning the website origin would make the
      // API and website depend on each other's deploy outputs. Tighten this once management access lands.
      Effect.map(HttpMiddleware.cors()),
      Effect.provide(Layer.mergeAll(handlers, RpcSerialization.layerNdjson)),
    );
  }),
) {}
