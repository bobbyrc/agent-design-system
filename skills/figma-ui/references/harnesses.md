# Harness adapters

The workflow and project files are shared. This reference translates skill loading, tool discovery, and independent review into the current harness. Read the applicable row; do not copy harness syntax into the portable workflow.

## Skill discovery and invocation

Checked September 29, 2026: Codex CLI 0.159.0, Claude Code 2.1.285, Pi 0.99.1.

| Harness | Installed user skill path | Explicit invocation | Refresh/check |
| --- | --- | --- | --- |
| Codex | `~/.agents/skills/figma-ui/SKILL.md` directly | `$figma-ui` | `/skills`; restart if a change is absent |
| Claude Code | `~/.claude/skills/figma-ui` symlink to the canonical directory | `/figma-ui` | `/skills`; `/reload-skills` if needed |
| Pi | `~/.agents/skills/figma-ui/SKILL.md` directly | `/skill:figma-ui` | `/reload`; inspect startup diagnostics |

Codex scans repository `.agents/skills` directories through the repository root and follows skill symlinks. There is no additional `~/.codex/skills/figma-ui` link. [Codex skills](https://learn.chatgpt.com/docs/build-skills#where-codex-loads-local-skills)

Claude discovers personal `~/.claude/skills` and project `.claude/skills` directories and accepts directory symlinks. A personal skill wins over a project skill of the same name; keep project configuration in project files instead of a competing `figma-ui` skill. [Claude skills](https://code.claude.com/docs/en/skills#where-skills-live)

Pi supports user `~/.agents/skills` and `~/.pi/agent/skills`, plus trusted project `.agents/skills` and `.pi/skills`. Its installed loader deduplicates identical real paths, but different files sharing a name produce a collision warning and the first wins. No redundant Pi link is needed. [Installed Pi skill documentation](/Users/bcraig/.local/share/mise/installs/node/24/lib/node_modules/@earendil-works/pi-coding-agent/docs/skills.md)

## Tools are separate from skill installation

MCP is the protocol a harness uses to connect external tools. A skill directory supplies instructions; it does not supply an authenticated Figma connection. Set up and authorize Figma separately in each harness. Do not edit credentials, MCP settings, or permission rules merely to run this skill.

Discover current capabilities and schemas, then record which route supplies node context, screenshots, assets, fonts, and native writes. Never assume tool names, account access, seat eligibility, or plugin availability transfers between harnesses. For native design creation, require a real Figma write tool or supported API route that creates editable nodes. A screenshot import or export is a raster reference, not proof of an editable design. Report the missing capability if the required route is unavailable.

| Harness | Discovery and execution adapter |
| --- | --- |
| Codex | Use available tool search or `ALL_TOOLS` metadata to find Figma capabilities. When applicable companion Figma skills are available, read their required instructions before tools such as `use_figma` or `get_design_context`. A Codex plugin is one possible route, not a portable requirement. |
| Claude Code | Inspect `/mcp` connection/auth state, then discover the server's current tools through the available search/catalog. Follow installed companion instructions where applicable. [Claude MCP](https://code.claude.com/docs/en/mcp) |
| Pi | Follow this user's lazy `mcp` proxy rule when the adapter is active: `mcp({search: "figma"})`, describe a returned tool, then call it with its actual schema. Search metadata alone does not prove a live authorized connection. Preserve the user's context-mode rules for large output. |

Pi has both built-in MCP and an optional adapter. The installed adapter's proxy supports `search`, `describe`, and `tool` with `args`; it uses shared `.mcp.json` or adapter configuration. Built-in Pi uses its own `mcp.json` and may expose `codemode` or `tool_search`. An adapter owning `/mcp` replaces built-in session MCP; shell `pi mcp` commands still inspect built-in configuration, so they cannot validate that adapter's connection. Use the active session's actual route; do not configure both to launch the same server. [Pi MCP docs](/Users/bcraig/.local/share/mise/installs/node/24/lib/node_modules/@earendil-works/pi-coding-agent/docs/mcp.md), [installed adapter docs](/Users/bcraig/.pi/agent/npm/node_modules/pi-mcp-adapter/README.md)

## Roles, models, and fresh review

A role describes a responsibility, not a required tool name. Use the strongest available approved model for producing or judging visual design and for defect review, following the user's model policy. Use less expensive models for deterministic evidence collection or implementing a fully specified design when permitted.

Codex may provide `collaboration.spawn_agent`; Claude Code may provide `Agent` with `model: "opus"` under this user's policy. Pi's core does not imply a subagent tool: use an installed supported extension only when available. Check the actual tool surface and authorization before dispatch.

Independent review receives the artifact and acceptance criteria without the generation prompt, implementation rationale, or implementer's self-report. If a fresh agent cannot be created, prepare that review packet for a separate session or a human reviewer. Record review as pending until the reviewer returns evidence; rereading in the same session is not independent review. Deterministic final checks remain necessary regardless of reviewer.

## Project instructions

Use one project `AGENTS.md` for shared policy and the project workflow files for visual identity, runtime commands, reference, and acceptance criteria. Codex and Pi discover `AGENTS.md`; Pi's `AGENTS.override.md` replaces another context file only in that directory. [Pi configuration](/Users/bcraig/.local/share/mise/installs/node/24/lib/node_modules/@earendil-works/pi-coding-agent/docs/configuration.md)

Current Claude can read `AGENTS.md` directly if no project/ancestor `CLAUDE.md` or `CLAUDE.local.md` takes its place. For reliable compatibility, preserve existing `CLAUDE.md` content and add a real `@AGENTS.md` import; an otherwise empty `CLAUDE.md` may instead be a symlink. Confirm Memory files with `/context`. [Claude shared instructions](https://code.claude.com/docs/en/memory#share-one-file-with-other-coding-tools)

Explicit user instructions and project-specific approval gates govern the task. Apply project-specific values over generic workflow defaults; keep conflicting instructions consistent instead of assuming every harness mechanically enforces the same precedence. Do not replace an existing project's templates or acceptance thresholds with shared examples.
