import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as GitHub from "alchemy/GitHub";
import { Config, Effect, Layer, Redacted } from "effect";

/**
 * CI credentials as code: mints a scoped Cloudflare API token and writes it, the account ID, and the Neon API key into
 * the repository's GitHub Actions secrets read by `.github/workflows/`.
 *
 * Deploy once from a trusted machine with an admin profile (Cloudflare API Tokens Write) and a GitHub token with `repo`
 * scope: `ECHO_GITHUB_OWNER=… ECHO_GITHUB_REPOSITORY=… NEON_API_KEY=… alchemy deploy --config stacks/github.ts --profile
 * admin --stage ci`.
 */
export default Alchemy.Stack(
  "EchoGitHub",
  {
    providers: Layer.mergeAll(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const owner = yield* Config.String("ECHO_GITHUB_OWNER");
    const repository = yield* Config.String("ECHO_GITHUB_REPOSITORY");
    const neonApiKey = yield* Config.Redacted("NEON_API_KEY");
    const { accountId } = yield* yield* Cloudflare.CloudflareEnvironment;

    // Workers + static assets, Hyperdrive, and the Alchemy state store (a Durable Object worker whose auth token lives in
    // the Secrets Store). Add permission groups here when the stack gains KV, R2, D1, or Queues.
    const apiToken = yield* Cloudflare.ApiToken.AccountApiToken("CIToken", {
      accountId,
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            "Workers Scripts Write",
            "Hyperdrive Write",
            "Secrets Store Write",
            "Account Settings Write",
            "Workers Tail Read",
          ],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: "*",
          },
        },
      ],
    });

    const secrets = [
      { name: "CLOUDFLARE_API_TOKEN", value: apiToken.value },
      { name: "CLOUDFLARE_ACCOUNT_ID", value: Redacted.make(accountId) },
      { name: "NEON_API_KEY", value: neonApiKey },
    ];

    yield* Effect.forEach(secrets, ({ name, value }) =>
      GitHub.Secret(name, { owner, repository, name, value }),
    );
  }),
);
