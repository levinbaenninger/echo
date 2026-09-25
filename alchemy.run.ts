import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as GitHub from "alchemy/GitHub";
import * as Neon from "alchemy/Neon";
import * as Output from "alchemy/Output";
import { Effect, Layer } from "effect";

import Api from "@echo/api";

export default Alchemy.Stack(
  "Echo",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), Drizzle.providers(), GitHub.providers()).pipe(
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
      // VITE_-prefixed env is inlined into the client bundle as import.meta.env.VITE_API_URL.
      env: {
        VITE_API_URL: Output.map(api.url, (url) => {
          if (url === undefined)
            throw new Error("API Worker has no public URL for the website to call");

          return url;
        }),
      },
    });

    // Preview deploys from .github/workflows/ci.yml export PULL_REQUEST; the comment keeps one logical ID so each push edits it in place.
    const github = yield* GitHub.GitHubEnv;

    if (github?.pr !== undefined) {
      yield* GitHub.Comment("preview-comment", {
        owner: github.owner,
        repository: github.repository,
        issueNumber: github.pr,
        body: Output.interpolate`
          ## Preview deployed

          | | URL |
          | --- | --- |
          | Website | ${website.url} |
          | API | ${api.url} |

          Built from ${github.sha.slice(0, 7)}. This comment updates on every push.
        `,
      });
    }

    return {
      websiteUrl: website.url,
      apiUrl: api.url,
    };
  }),
);
