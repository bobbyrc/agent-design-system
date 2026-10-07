# Review-only Claude Opus 5.5

This workflow reviews open pull requests, including drafts and stacked PRs, using
`claude-opus-5-5` and Claude subscription authentication. It posts one summary
comment. It does not modify code, run repository scripts, commit, push, merge,
change PR status, or deploy.

## Activation and authentication handoff

The workflow PR is a draft for review. Publishing that PR does **not** activate
reviews. Merging it into the repository default branch requires separate approval.
In ShipHand, the existing CI/deploy workflows make a successful CI run following a
push to `main` deploy the production API. Merging even this workflow-only PR can
therefore trigger that existing production deployment and requires explicit approval
for that consequence. This change does not alter existing CI or deploy workflows.

`CLAUDE_CODE_OAUTH_TOKEN` was absent in the three target repositories during setup.
The account owner must authorize and perform the authentication handoff:

1. On your own trusted computer, sign in to Claude Code using the intended Max
   subscription and run `claude setup-token` yourself.
2. Add its output as the repository Actions secret named
   `CLAUDE_CODE_OAUTH_TOKEN` under Settings → Secrets and variables → Actions for
   each repository you approve: `bobbyrc/shiphand`, `bobbyrc/deckhand`, and
   `bobbyrc/agent-design-system`. Never paste the token into chat, PRs, commits,
   logs, or issue comments. Do not add an API key as a substitute.
3. After approving activation, merge the workflow PR into the default branch.

No credentials are generated, read out, or installed by this change. The workflow
uses the Max subscription rather than the separately billed managed Code Review
service or a Console API key. Subscription limits and GitHub Actions minutes apply.
If Max does not permit this exact model, the run fails; no fallback is configured.

## Request a review

After activation, a human with repository write, maintain or admin access can:

- Post exactly `@claude review` as a new top-level comment on an open PR.
- Open Actions → Claude Opus 5.5 review → Run workflow, select the repository's
  default branch, and enter the open PR number.

The comment must contain only that command. Additional comment text is not passed
to Claude. Inline comments, bot comments, edited comments, issue comments, PR
creation, pushes and synchronization do not initiate reviews. Fork PRs and closed
or merged PRs are skipped. Drafts remain drafts. The actual base branch and SHA are
read from GitHub for every run, including stacked bases. The workflow preserves the
PR's exact base branch name and same-repository checks, then resolves the current
`heads/<base branch>` git ref to obtain its authoritative commit SHA. It does not
trust cached `pull_request.base.sha` or GraphQL `baseRefOid`: during preparation,
DeckHand #51 reported base SHA `d9afdad6b016c45c086d13f25477ed1a5ae61b77` while
`main` had advanced to `bf1f7578a94ad46cfd1262debb22a5f86c941c34`. The gate,
snapshot preflight, and immediate pre/post publication checks all read the live git
ref. Base advancement invalidates findings even if PR metadata remains unchanged.
No base is hard-coded.

Requests for a PR are serialized. Bot-authored completion markers from successful
runs of this same workflow on the default branch by authorized humans deduplicate the
same head SHA, actual base SHA/ref and requested model. Completed runs are also
bound to their originating sanitized artifact's exact scope and verified model.
If that artifact has expired or cannot be verified, the workflow fails with an
actionable request to inspect the existing review instead of duplicating it.
Per-PR concurrency prevents overlapping reviews; running comments are informational
and cannot block unrelated snapshots. Failed/stale runs can be retried. A head/base change
between preparation and publishing invalidates the review and withholds findings.
Safe report metadata binds the result to its exact PR, head/base/ref and run. The
publisher checks the PR immediately before and after posting and retracts findings
if it moved or closed. GitHub comments have no atomic comparison-and-swap operation;
a later PR update can still make a previously posted, explicitly SHA-scoped review
outdated. Request a fresh review after changes.
Cancellation can leave a running comment; a fresh request can retry once that run
has completed. GitHub concurrency may replace an older queued request with a newer
one for the same PR, and completion still deduplicates the surviving request.

## Enforced review scope

The model runs in a separate job with only read permissions. Trusted GitHub API
steps build inert numbered `.txt` files in a clean directory; there is no checkout.
Repository paths, scripts, `.claude`, `CLAUDE.md`, `.mcp.json`, hooks and symlinks
never become executable configuration. Full small-text head files and the immutable
GitHub three-dot diff against the actual base are available as review evidence,
along with full changed old-side text from the merge base. Blob reads are batched
through GitHub GraphQL to avoid exhausting the repository's REST request allowance.
GitHub's GraphQL text truncation is detected by byte counts; bounded nonbinary files
then use an immutable REST blob fallback with exact byte and UTF-8 checks. During
setup, ShipHand's 519,578-byte `ships.json` returned only 512,000 bytes through
GraphQL, so this fallback is required for the delivered PRs.

The official action's pinned `base-action` entrypoint performs inference only. The
main entrypoint can fetch Git and restore `.claude` configuration on PR comment
events, so it is intentionally avoided. No GitHub App token or persistent GitHub
credential is minted. Only trusted GitHub API steps receive the ephemeral
`github.token`; the model receives no GitHub token. The final publishing job has
contents read access to recheck the live base ref, pull-request write access, and
no Claude credential.

Claude Code 2.1.289 is selected by the pinned action. `--restricted` confines file
tools to the working directory, `--bare` disables discovery, `--tools Read` removes
command/edit/network/agent tools, scoped Read permissions allow only snapshot
files, all MCP tools are denied, and strict empty MCP configuration disables MCP
servers. Hooks, plugins, slash commands, and project/local settings are disabled.
`dontAsk` denies unapproved tools. These controls enforce read-only analysis rather
than relying on the review prompt. Runtime tool/model metadata must also match.

The deterministic reporting step reads runtime initialization and token-usage model
IDs and accepts only `claude-opus-5-5` or its dated version. A requested model is
not described as verified until actual usage matches. Model/tool mismatches fail
closed. Raw execution transcripts, source snapshots and authentication files are
never uploaded. Only a bounded, token-redacted summary is transferred to the
isolated publisher, with one-day retention. The publisher renders model text as an
inert code block; arbitrary Markdown images, links and HTML never activate. Actions
debug logging must be disabled: the authentication preflight blocks known debug
settings because the upstream SDK logs fuller content when debug logging is enabled.

## Limits and validation

Reviews are static analysis; no tests execute. The workflow fails instead of
publishing partial reviews when the GitHub comparison/tree is truncated or reaches
the 300-file comparison API limit, the diff and immutable file evidence disagree, the diff
exceeds 1.5 MB, the snapshot exceeds 1,000 regular head files or 20 MB, or either
side of a changed file is missing, binary, a symlink, a submodule, or larger than
1 MB (including deletions and renames). This covers the existing changed DeckHand
lockfile (258,993 bytes) and ShipHand provenance files (up to 519,578 bytes).
Omitted unchanged binary/oversized
context is listed in the snapshot index. Very large repositories need an explicitly
reviewed alternative scope before increasing limits.

External actions are pinned to commit SHAs. The official action still installs its
pinned Claude CLI and SDK dependencies through Anthropic's upstream installer and
Bun; these upstream dependencies remain a supply-chain trust boundary. Repository
content remains untrusted input and model findings require human assessment.

References checked during preparation:

- [Claude GitHub Actions: OAuth, model selection, billing and triggers](https://code.claude.com/docs/en/github-actions)
- [Claude CLI tool restrictions, bare/restricted modes and MCP](https://code.claude.com/docs/en/cli-reference)
- [Pinned official inference action source](https://github.com/anthropics/claude-code-action/blob/cab360f6565aa35a51d6ce9e43f1f4287c0a32ea/base-action/action.yml)
- [Pinned SDK argument handling](https://github.com/anthropics/claude-code-action/blob/cab360f6565aa35a51d6ce9e43f1f4287c0a32ea/base-action/src/parse-sdk-options.ts)
- [Pinned execution metadata handling](https://github.com/anthropics/claude-code-action/blob/cab360f6565aa35a51d6ce9e43f1f4287c0a32ea/base-action/src/run-claude-sdk.ts)
