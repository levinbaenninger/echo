# CI and deployments

GitHub Actions runs checks on every PR and push to `main`, deploys a preview per PR, and deploys production on merge.

| Event                  | Workflow              | Job                    | Alchemy stage |
| ---------------------- | --------------------- | ---------------------- | ------------- |
| PR opened / pushed     | `ci.yml`              | `check` → `preview`    | `pr-<number>` |
| Push to `main` (merge) | `ci.yml`              | `check` → `production` | `prod`        |
| PR closed or merged    | `preview-cleanup.yml` | `destroy`              | `pr-<number>` |

- `check` runs `vp check` (format, lint, type check), `vp run -r test`, and `vp run -r build`. Deploys wait for it.
- Each stage gets its own Hyperdrive config, API Worker, and website. The `prod` stage owns the Neon project. Preview stages reference it (`Neon.Project.ref`) and each add one branch to it ([Alchemy guide](https://alchemy.run/neon/guides/preview-branches/)), so `alchemy destroy --stage pr-<number>` removes only that branch. Local stages such as `live_<user>` still create their own project. State for all stages lives in the account's Alchemy Cloudflare state store.
- A preview branch forks the project's default branch, which holds no data, because production lives in its own branch. Previews start empty and apply every migration, so production rows never reach a public preview URL. To preview against a copy of production data, pass `parentBranch: yield* Neon.Branch.ref("main", { stage: "prod" })` in `packages/db/src/db.ts`.
- Preview branches expire 14 days after their last deploy, so Neon deletes them even if the cleanup job never runs.
- The preview job posts one PR comment with the website and API URLs (`GitHub.Comment` in `alchemy.run.ts`) and edits it on each push.
- Deploy jobs share a concurrency group per stage and never cancel an in-flight apply. The cleanup job joins the preview's group, so a destroy waits for a running deploy.
- PRs from forks get no secrets, so they skip preview and cleanup.

## One-time setup

1. Push the repository to GitHub.
2. Add three repository secrets under **Settings → Secrets and variables → Actions**:

   | Secret                  | Value                                                                                                                          |
   | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
   | `CLOUDFLARE_API_TOKEN`  | Account API token with Workers Scripts Write, Hyperdrive Write, Secrets Store Write, Account Settings Write, Workers Tail Read |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID                                                                                                          |
   | `NEON_API_KEY`          | Neon API key                                                                                                                   |

   Or let Alchemy create them. `stacks/github.ts` mints the scoped Cloudflare token and writes all three secrets. Run it once from your machine with an admin Cloudflare profile (API Tokens Write) and a GitHub token with `repo` scope (`gh auth login` works):

   ```sh
   alchemy profile create admin
   alchemy profile edit --profile admin
   ECHO_GITHUB_OWNER=<owner> ECHO_GITHUB_REPOSITORY=<repo> NEON_API_KEY=<key> \
     vp exec alchemy deploy --config stacks/github.ts --profile admin --stage ci
   ```

3. Optional: in **Settings → Branches**, require the `Check, test, build` status on `main`.

## Notes

- Deploy `prod` before the first preview. Preview plans fail with `InvalidReferenceError` until the prod stage has created the Neon project. Merging the PR that adds CI deploys prod, and so does `vp exec alchemy deploy --stage prod` from your machine.
- The first `prod` deploy creates new production resources. Local deploys use the default stage `live_<user>` and are unaffected.
- Drizzle migrations run as part of each deploy, including on every merge to `main`.
- Every open PR holds a branch in the production Neon project. Check that your Neon plan's branches-per-project limit covers your open PRs plus the prod branch and the default branch.
- Neon locks a project while it runs an operation. Merging a PR starts the prod deploy and the preview cleanup at the same time against the same project, so either can fail with HTTP 423 (Locked). Re-running the failed job fixes it.
- Each preview also creates a Hyperdrive config, a Worker, and a website Worker, which count toward Cloudflare account limits.
- Previews and production share the same credentials, so code in any PR from this repo can change production. For stronger isolation, put production secrets in a GitHub `production` environment limited to `main` (`GitHub.Secret` accepts `environment`). On private repos, environments need a paid GitHub plan.
- If `schema.ts` changes, commit the migration drizzle-kit generates. The `check` job fails otherwise.
- To tear down a preview by hand: `vp exec alchemy destroy --stage pr-<number>`.
