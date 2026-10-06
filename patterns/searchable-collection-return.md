# Searchable collection and recoverable return

ID: `searchable-collection-return/v1`. Original task-level synthesis; effectiveness untested. Retrieval tags: web, operational, search, filter, comparable-records, list-detail, mutation, return, recovery. Source IDs: `SP-01`, `SP-03`, `SP-04` in [provenance](../docs/web-source-provenance.md).

Use when records have comparable fields, scanning/filtering is part of the task, and an individual action fits a focused detail view. Avoid when recognition is primarily visual, users need sustained simultaneous editing of many records, or detail needs more room than a panel can provide. A table is an inference for cross-record comparison, not a universal preference.

Require stable IDs, readable identity, comparable date/status fields, eligibility, and facts needed for the action. Dependencies: project list/table and form primitives, stable view or route state, explicit mock/production mutation contract, and a documented recovery guarantee. Use existing tokens/components. Prioritize task scope and meaningful count, comparable records, selected identity/action, then metadata. Put essential identity and due date ahead of ornamental summaries; statuses carry text meaning independent of color.

## State and transition contract

| State | Presentation and behavior | Evidence to require |
| --- | --- | --- |
| Populated | Search/filter and meaningful scope/count; stable row identity | Correct matching IDs/count and selected record |
| No records in scope | Explain absence and appropriate next step | Distinct from no filter matches |
| No filter matches | Retain query and offer a clear reset | Reset restores the intended scope |
| Selected detail | Identity, decision facts, eligible action | Queue scope, selection and return context preserved |
| Pending | Honest progress; prevent repeated mutation | No confirmed success before store/service confirmation |
| Recoverable failure | Retain input and explain retry | Confirmed inventory unchanged; reusable work retained |
| Success | Show exact confirmed record and updated scope | UI and store agree; one confirmed event |
| Long content | Let important identity expand/wrap | No hidden action, illegible shrinkage or ambiguous identity |
| Keyboard focus | Logical path and visible focus | Critical task completes without pointer or trap |

Conditional states include permission denial only when authorization is modeled, offline only when supported, and missing accessories when relevant. Record legitimate exclusions in acceptance; do not silently drop required states.

Open detail preserves filters and selected ID. Submit enters pending and uses safe request semantics. Failure retains work without changing confirmed inventory. Retry does not duplicate a confirmed return. Success reflects persisted state. Returning to the collection restores useful context; if the returned record leaves the filter, explain the update and restore focus to a meaningful remaining control.

## Responsive and semantic behavior

Use side-by-side collection/detail only while both remain readable and operable. At narrower widths use a focused full detail view and restore scope on return; do not squeeze desktop geometry. Exercise 320 CSS-pixel reflow where applicable, actual breakpoint neighbors, long content and text enlargement. These are checks to resolve for the project, not a copied device/pixel tolerance policy.

Use semantic controls and visible labels, meaningful status announcements, a logical focus path, and dialog semantics only for truly modal behavior. Select focus/announcement behavior from actual navigation and mutation context. Automated scanning is limited evidence; manual keyboard and image checks remain distinct.

## Failure mechanism and repair

An equal-emphasis set of metric cards and colored row badges can conceal the overdue queue. Repair by elevating scope and exceptions, aligning comparison fields and quieting metadata. A click-triggered success toast can promise a return that never saved. Repair by separating pending, failure and confirmed success, asserting store agreement, and retaining work for retry. Offer undo only when real reliable reversal exists; otherwise design appropriate confirmation/recovery from actual risk.

The neutral [equipment example](../examples/equipment/brief.md) teaches this mechanism. Source-pack composition diagrams are schematic teaching studies, not application captures or measured improvement. No external visual assets are included by this pattern.

Verify task/store agreement, failure/retry, duplicate prevention, narrow geometry and actual images, keyboard, state-specific accessibility scan with triage, and independent visual review. Use the project contract's exact IDs. A changed primary task warrants a documented pattern decision, not forced adherence. See [web workflow](../docs/web-workflow.md).
