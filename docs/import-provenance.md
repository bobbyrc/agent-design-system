# Import provenance

Snapshot imported October 1, 2026 from the author's existing reusable design workflow. [The manifest](import-manifest.json) records every imported source file and its SHA-256 identity; transformed research Markdown records both the source and destination identities.

## Sources

- `~/.agents/skills/figma-ui/`: 14 canonical skill files, copied byte for byte, excluding Python caches.
- `/Users/bcraig/agents/`: seven generic research and review reports: design examples, design guidelines, measurement-helper review, quality-target review, and three public-reference analysis/review records. Only Markdown link destinations pointing to copied files have been made relative.
- `/Users/bcraig/agents/AGENTS.md` and `EVIDENCE.md`: approved guidance copied to `../guidance/`.
- `/Users/bcraig/agents/lessons.md`: reusable design-work and shared-workflow lessons copied to `../tasks/lessons.md`; the unrelated music CSV lesson is excluded. The scope correction from this import is recorded separately at the end.

Application-specific designs, screenshots, artboards, project evaluations, mixed setup/proposal reports, and the duplicate measurement candidate archive are excluded. The reusable helper and its tests are already part of the canonical skill. No installed skill, source application, or external setting is changed by this import.

## Intentionally retained historical paths

Absolute paths in inline code, installation examples, historical measurement/reference evidence, copied guidance, canonical skill content, and source-identity JSON are retained as provenance. They describe the original machine and may not resolve elsewhere. Links to local installed Pi documentation remain absolute because those external artifacts are not included. Historical raw hashes are preserved rather than rewritten.

The retained `/Users/bcraig` prefix identifies the original working directories, not an installation requirement. The canonical skill remains byte-identical to its source, including its historical links. Generic reference-analysis reports discuss public instructional examples, not application designs created for a project.
