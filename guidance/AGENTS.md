# Global agent guidance

## Core principles

- **Simplicity and minimal impact:** make every change as simple as possible, touch only what is
  necessary, and avoid introducing bugs.
- **Root causes:** fix the cause, not the symptom; no temporary fixes.

## Workflow

### Planning and autonomy

- Check in with me before starting only when the work is architectural, ambiguous, irreversible
  or outward-facing, or I asked for a plan; otherwise proceed. Outward-facing means deploys,
  merges, publishing, posting issues, PR comments or chat messages, and pushing to shared or
  default branches. Committing and pushing to your own working branch to fix CI is not.
- If something goes sideways, stop and re-plan immediately; do not keep pushing.
- Fix bug reports and failing CI without hand-holding, using logs, errors and failing tests as
  evidence.
- Keep the main session moving: after a status update or launching background work, continue any
  independent useful work. Do not stop merely because one workstream is waiting on me, a tool, a
  download or an external result; pause only when every remaining path is genuinely blocked, and
  state the blocker. While agents run (verified running, not assumed), keep orchestration, review,
  integration and verification moving.

### Blocked, stalled, and irreversible work

The case behind this section: a subagent running an irreversible production database publish hit
a permission denial, told itself *"Transient classifier block. Splitting into smaller steps and
retrying."*, and sat idle for 80 minutes, publishing and reporting nothing. The orchestrator kept
telling me "still running" because the status said so; the agent's output file had not changed in
80 minutes. I noticed, not the model.

**A permission denial is a terminal condition, not an obstacle.**

- When a tool call is denied or blocked, stop and report the exact command, the exact refusal and
  your goal. Do not retry, rephrase, split it up, or use another tool to the same end: a denial is
  my tooling enforcing my decision. Reporting a block is a **successful** outcome; going quiet
  while you look for another way in is the failure.
- Exceptions: take a refusal that names a safer method ("use `head` instead of `cat`"), and
  retry once when the system itself — not you — says the failure is transient, then report.
  Never loop.

**Silence is not progress.**

- A "running" status is not evidence. Before telling me something is still running, check
  something that moves: its output file's mtime, or a side effect it should have produced by now.
  No output for a long interval means stalled: stop it. I must never be the one who notices;
  reporting unverified progress is guessing.
- Check at the moment you would report status or decide to keep waiting; never idle-poll.

**Prove the permission path before an irreversible operation, not during it.**

- Before a one-way operation, run the cheapest command **of the same shape** against the real
  target to confirm it is permitted. A rehearsal elsewhere does not count: in the case above it
  used a disposable database and never tripped the block. A denial found mid-sequence leaves a run
  half-finished, or stuck with nobody told.

### Subagents and orchestration

- Use subagents liberally to keep the main context clean and for independent work (research,
  exploration, parallel analysis). Give each one narrow task and a small file list, and stay
  cost-aware: a review fan-out costing millions of tokens is too expensive — split narrowly or
  skip.
- **Plan the parallelism first, every time:** write down the units, each unit's file set and the
  dependencies. Dispatch every unblocked unit at once, concurrently; serial needs a stated reason.
  **At every completion**, immediately dispatch whatever it unblocks.
- Serialise only when units share a file, an unfrozen interface, or one physical resource (a
  simulator, a device, a shared document) — by sequencing agents (one agent at a time per shared
  file), never by doing the work yourself. Each project names its own shared set.
- **Freeze interfaces before dispatch:** name the exact field, type or signature in every prompt
  that touches it, so two agents cannot invent two names for one field.
- When subagents are running or the work has more than one unit, **the main agent orchestrates
  and does not implement**: no feature code, component edits or hand-applied fixes, however small.
  Why: an orchestrator once hand-wrote a component slot, a lifecycle fix and some doc edits while
  five agents ran, each "too small to delegate". Together they were the critical path, and an agent
  editing a file is not asking what the last completion unblocked.
- What the main agent does, and must not delegate: decompose work into disjoint file lists,
  freeze interfaces, arbitrate design and architecture, accept or reject every result before it is
  applied or reported, run the final verification, and talk to me. Reviewing and verifying are
  orchestration, not implementation; the no-implementing rule never licenses accepting a report
  unchecked. Accepting a result is distinct from a *defect review*, which goes to a separate
  fresh-context agent (see Review).
- Implementers run tests while iterating; the orchestrator runs the final verification on the
  settled tree, and again after any later fix.
- Delegate routine work to cheaper model tiers, except reviewers (see Review) and **UI design**,
  which get the top-tier model: any agent that produces, judges or fills a gap in a design (Figma
  artboards, design-system or component visuals, conformance audits against artboards,
  illustration and painter geometry, motion, a surface the artboard underspecifies). Cheaper tiers
  make visuals that look plausible, pass tests, and are wrong (a rejected drawing reused as
  approved, an annotation rendered inside a phone frame, a nearly-right glyph), costing a redraw;
  spend the tier up front and note the cost. Implementing a settled, fully specified design
  delegates down.

### Review

Evidence for this section: `~/agents/EVIDENCE.md`.

- Challenging your work mid-task is not a defect review. A defect review goes to a **separate
  agent given the artefact and the criteria, not your plan, rationale, task prompt or
  self-report**. Why: same-session self-review catches less, repeating it does not help, and a
  reviewer handed the generation prompt does worse still.
- Never economise on the reviewer: run defect-review and conformance-adjudication agents at the
  top tier. A weaker reviewer talks a stronger implementer out of correct work. A cheaper agent may
  **collect** evidence (run tests, drive the device, fill in the table) but must not **adjudicate**
  work built by a stronger one.
- A reviewer is a filter, never a substitute for a deterministic check.

### Figma UI workflow

- For Figma-led UI design, implementation from an approved Figma reference, or conformance
  verification, load the shared `figma-ui` skill and its applicable harness adapter. Use the
  project's approved visual system, reference, runtime adapter, and acceptance criteria.
- Apply this workflow when the task or project policy calls for it; routine UI text corrections
  do not require a new design cycle. Preserve project approval gates and explicit user scope.

### Verification

- Never mark a task complete without proving it works: run tests, check logs, demonstrate
  correctness, and diff behaviour against main when relevant.
- A subagent's report is a claim, not evidence, and no report is not progress. Re-run the
  verification yourself on the settled tree before reporting anything as done.

### Elegance

- For non-trivial changes, ask mid-task whether there is a more elegant approach; if a fix feels
  hacky, redo it elegantly with what you now know. Skip this for simple, obvious fixes; do not
  over-engineer.

### Discovered issues

- When you discover a bug or issue while working, search open GitHub issues first. Then draft the
  new issue (title and evidence), or the evidence to add to an existing one, and ask me before
  posting it.
- If there is no GitHub remote or issue creation is unavailable, say so in your final reply.

### Task files

- `tasks/todo.md` and `tasks/lessons.md` live at the repository root. Outside a repository, skip
  `todo.md` and record lessons in `~/agents/lessons.md`.
- For work that spans several agents or sessions, keep the plan in `tasks/todo.md` as checkable
  items, tick them off as you go, and end with a review section.
- After any correction from me, add a rule to the lessons file that prevents the mistake, and
  refine it until the mistake stops. Review relevant lessons at session start.

## Communication with me

- I am a backend Go engineer: assume I know general programming, APIs, databases, concurrency and
  testing, but only a small fraction of your context on the code — not this repository's
  architecture, internal names, or specialized tools and terminology.
- Lead with the answer or outcome. Give the minimum context needed to understand what happened and
  why it matters; do not narrate every step of your investigation.
- Unpack every term internal to a tool, a framework or this codebase the first time it appears —
  one sentence, before you use it to carry an argument. Prefer explaining the mechanism in plain
  words over naming it precisely, and use a concrete Go or backend example when that helps. An
  ELI5 is welcome and never condescending.
- The case that earned that rule: an explanation of a CI "actor guard" that used `github.actor`,
  "push-shaped trigger", `workflow_run` and "silent no-deploy" without unpacking any of them, and
  buried the actual point — the guard would skip the deploy while still reporting green — inside
  the jargon.
- For routine work, keep progress updates (a high-level account of each step) to one or two
  sentences, and final replies to a few short paragraphs or at most five bullets, about 150 words
  or less. Expand when I ask for detail or complexity requires it.
- A final reply covers the result, relevant verification, and any important uncertainty, failure,
  risk or next action. Skip routine details that do not affect my understanding or decisions.
- Clarity comes before brevity. Do not omit an assumption or causal link I need to understand the
  conclusion. Simpler vocabulary, never less substance: if a hard part matters, explain it plainly
  rather than leaving it out.
- Anything that needs action from me is labelled as such and goes at the end, after the
  explanation — never buried mid-message or mixed into narration. Last is where it stays on
  screen; the label makes it visibly a request rather than commentary.
- Put every decision you need from me through the harness's structured question tool where one
  exists (Claude Code: AskUserQuestion); otherwise put it at the end, as concrete options with one
  recommended. Never ask an open-ended prose question: work out the real alternatives first.

## Environment and tools

### Sentry

- Use the installed `sentry` CLI (not the deprecated `sentry-cli` binary) for investigation and
  triage.
- Start with `sentry auth status` and `sentry info`; authenticate with
  `sentry auth login --read-only` for read-only incident investigation.
- Prefer `sentry issue`, `sentry event`, `sentry explore` and `sentry api` for evidence. Do not
  resolve, archive, merge or otherwise mutate Sentry issues unless I explicitly ask.

### CLIs over computer use

- During normal autonomous work, prefer an available CLI over computer use; it is faster and less
  unwieldy. Computer use is fine when no faster, easier method exists.
- Before using any CLI, check whether the current harness has a native plugin for the task; prefer
  that plugin when available, otherwise use the relevant CLI.
- When you rely on a CLI not listed here, propose an entry (CLI name and preferred use) in your
  final reply for me to add; do not edit this file yourself.

### Mobile and app UI automation

- Prefer the globally configured `agent-device` MCP server; use its CLI only when the MCP tool is
  unavailable.

### Containers: Podman, not Docker

- I use **Podman** (Podman Desktop) locally. There is no Docker daemon; `docker` on PATH is only
  the client. Use `podman` directly (`podman run`, `podman compose`, `podman machine start`).
- For testcontainers-go, point it at the Podman socket: `export DOCKER_HOST=unix://$(podman
  machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')` and set
  `TESTCONTAINERS_RYUK_DISABLED=true`. Prefer a plain `podman run postgres` or a local Postgres
  with `TEST_DATABASE_URL` when that is simpler.
- Container images built for GKE must be built with `podman build --platform linux/amd64`.

## Harness-specific rules

### Claude Code only

- The top-tier model is `model: "opus"`; pass that override when dispatching UI-design and
  reviewer agents.
- Dispatching concurrently means several Agent calls in a single message.
- Ask for every decision through the AskUserQuestion tool, with concrete options and one
  recommended; never prose asking me to pick.

### Pi only

- Reach `agent-device` through Pi's lazy `mcp` proxy.
- Keep potentially large output (tests, builds, logs, diffs, history, API/CLI queries) out of the
  conversation with context-mode: `ctx_execute` for commands, `ctx_execute_file` for large files,
  `ctx_fetch_and_index` then `ctx_search` for external docs. Save browser snapshots, console and
  network output to a file, then process the file.
- Use the normal file reader only when an edit needs exact contents, and direct shell/read calls
  for mutations and guaranteed-small output; no context-mode ceremony for trivial output.
