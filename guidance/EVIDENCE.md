# Evidence behind ~/agents/AGENTS.md

Research citations moved out of `AGENTS.md` so they are not loaded into every session. Each block
is quoted verbatim from the original file (re-wrapped only), grouped under the rule it supports.
The rules themselves live in the "Review" section of `AGENTS.md`.

## A defect review goes to a fresh agent given only the artefact and the criteria

Supports: "A defect review goes to a separate agent given the artefact and the criteria, not your
plan, rationale, task prompt or self-report."

> Re-reading your own output in the same session to hunt for errors measured F1 24.6%, and doing
> it a second time was the worst of the four conditions tested at 21.7% — against 28.6% for a
> fresh session given only the artefact (Song, arXiv:2603.12123; graded `E2` in ShipHand's
> `ui-conformance` skill evidence base). The load-bearing control is that one self-review pass
> versus two is not statistically significant: reviewing *again* is not what helps; reviewing
> *without the production history* is.

> A reviewer handed the generation prompt scored 23.8% — below plain self-review — so the instinct
> "give the reviewer full context" is backwards.

## Never economise on the reviewer

Supports: "Never economise on the reviewer: run defect-review and conformance-adjudication agents
at the top tier ... A cheaper agent may collect evidence ... but must not adjudicate work built by
a stronger one."

> A reviewer *weaker* than the implementer makes strong work **worse** — pass rate **−8.6 pp**,
> with **13 regressions against 3 fixes** — where a stronger reviewer over weaker work gained
> +18.1 pp with 26 fixes against 5 regressions (Xiang et al., arXiv:2607.21656; graded `E3` in
> ShipHand's `ui-conformance` skill evidence base). A cheap reviewer does not merely find less; it
> actively talks a stronger implementer out of correct work.

> The honest limit, which travels with the claim: that measurement varies the model with
> same-context self-review as its baseline, so "give the reviewer a fresh context" is directly
> measured while "do not go cheaper on the reviewer" is inference from an adjacent result.

## A reviewer is a filter, not a substitute for a deterministic check

Supports: "A reviewer is a filter, never a substitute for a deterministic check."

> And carry the ceiling with the number: the best condition still caught only 28.6% of injected
> defects, so a reviewer is a filter and never a substitute for a deterministic check.
