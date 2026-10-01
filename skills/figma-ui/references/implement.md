# Implement the approved reference

## Establish the inputs

Locate approved manifest entries and their approval record. Read the pinned node's screenshot, metadata, literal strings, variables, component properties, and assets. Expand sparse context through relevant child nodes rather than inferring missing geometry. Check that the retrieved content belongs to the frozen revision; otherwise use the preserved bundle or report the mismatch.

Inventory the repository's design system and components before writing replacements. Record exact mappings from Figma component identity to source path, import, component name, props, variants, and token identities in `component_map` or a file it references. Verify the mappings against the current repository revision and API. Verify native Code Connect availability in the current account and tool route; when available, it can supply this mapping. When verified unavailable, use the exact repository-local mapping without assuming an upgrade. This fallback does not provide native MCP snippet injection.

Download approved static assets to stable project paths, preserving identity, dimensions, crop, and intended usage. Resolve the exact font family, face, weight, and shaping behavior. Do not approximate icons with a similar glyph or replace an illustration with generated artwork. Preserve dynamic data and its formatting contract; use fixtures to compare the approved representation.

## Translate intent and behavior

Use the platform's native responsive layout rather than blindly turning Figma coordinates into fixed positioning. Preserve the approved bounds, gaps, alignment, typography, semantic token roles, and component variants at each reference configuration. Handle the agreed states and interactions, including overlays, navigation, keyboard, focus, errors, and accessibility semantics.

Put implementation-specific launch, fixture, capture, and measurement details in [the adapter](../assets/adapter.md). Derive checks from the reference before changing code: literal strings and formatting, token/component use, independent element geometry, clipping, wrap, and interaction outcomes. Use [verify](verify.md) for the required evidence and runtime preconditions. Test meaningful visible properties rather than duplicating implementation constants.

## Gaps and differences

If the reference underspecifies a consequential choice, return to design or use an already delegated decision scope. Record minor implementation decisions that preserve the approved outcome. Do not quietly redesign a surface while claiming conformance.

When code and reference disagree, determine whether the implementation, data fixture, or design record is wrong. Show evidence for that ruling. A correction to the approved reference requires approval within the existing authority, a new pinned revision, and renewed affected-state checks; preserve the previous reference. Fix the underlying geometric or behavioral cause rather than covering it with decorative layers.

Implementation handoff includes changed paths, build identity, reference IDs, commands/results, and remaining gaps. A working control does not prove its appearance matches; a matching capture does not prove the control works. Run both kinds of checks before acceptance.
