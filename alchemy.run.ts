import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Neon from "alchemy/Neon";
import { Effect, Layer } from "effect";

import Api from "@echo/api";

export default Alchemy.Stack(
  "Echo",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), Drizzle.providers()).pipe(
      Layer.provideMerge(Neon.providers()),
    ),
    state: Cloudflare.state(),
  },
  // Alchemy's RpcWorkerYieldable declares its requirements as any.
  // @effect-diagnostics-next-line anyUnknownInErrorContext:off
  Effect.gen(function* () {
    const api = yield* Api;

    const website = yield* Cloudflare.Website.Foldkit("Website", {
      rootDir: "apps/web",
    });

    return {
      websiteUrl: website.url,
      apiUrl: api.url,
    };
  }),
);
