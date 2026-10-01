# Establish observable visual-quality targets

Use this guide when defining or judging a design direction. Project style, explicit user choices, and platform constraints take precedence. Examples are candidates to learn from, not certified evidence of usability or permission to copy a product. Do not turn a reference's fonts, colors, density, or measurements into universal rules.

## Choose and inspect relevant evidence

Choose evidence for the question the draft needs to resolve; the roles below are alternatives or complements, not a required set. Reuse relevant project references and settled direction choices; there is no required sample count or fresh exploration round. When selecting full-screen or task-flow examples, match the target's platform, task, information density, input method, and theme. A marketing landing page rarely answers how a dense working screen should behave.

| Evidence role | What to learn from it | What it cannot establish alone |
| --- | --- | --- |
| Craft instruction, such as Refactoring UI | A reasoned visual change: how hierarchy, spacing, type, or separation addresses a specific problem. | That the treatment fits this project's identity or improves users' task performance. |
| System convention, such as Carbon or Fluent | Consistent component behavior, text roles, and layout relationships within an applicable system. | That another platform needs the same fonts, dimensions, or visual identity. |
| Shipped-screen precedent, such as Mobbin or SaaSFrame | How a comparable product arranges realistic content and states in context. | Why the choice was made, or whether it works well; gallery inclusion and a newer version are not proof of improvement. |
| Usability research, such as applicable Baymard findings | Observed task problems and research-based criteria, within the study's context. | General aesthetic quality or transfer to a different task without examining applicability. |

Inspect the actual screenshots or rendered examples at a useful size, including the relevant state. A collection title, search thumbnail, or written claim is not visual evidence. If an example is inaccessible, record that limit and choose accessible evidence instead; do not claim to have inspected it.

Record the source and evidence role, relevant screen/state or passage, date inspected, mechanism, expected visible effect, and what to exclude. Distinguish the source's explanation from your inference. Put the resulting targets in the brief's visual-quality evidence table. “Polished,” “modern,” or “like this app” is not a sufficient target.

## Curated screens and craft instruction

The following sources were checked on 2026-09-29. Use accessible examples within existing access; limited previews may be enough. Gallery inclusion and brand prestige are not evidence that a pattern serves this task.

| Source | What it contributes | Access and limits |
| --- | --- | --- |
| [Mobbin](https://mobbin.com/) | Shipped iOS and web screens and flows, with weekly additions; useful for finding a comparable task in context. | [Limited free access; broader search and flows are paid](https://mobbin.com/pricing). Its [MCP service](https://mobbin.com/mcp) is an optional retrieval route only with existing authorized paid access; this guide does not authorize setup or a subscription. Inspect the selected flow/state, not just an attractive screen. |
| [Refactoring UI](https://refactoringui.com/) | Illustrated instruction on hierarchy, spacing, typography, and finishing helps explain why a draft feels unresolved and how to improve it. | Sample chapters are available; the book and videos are paid. This is craft instruction, not an archive of shipped interfaces or a universal style. |
| [SaaSFrame](https://www.saasframe.io/app/pricing) | Product UI and flows provide another source for web application references. | Free previews with broader paid access. Filter for actual product work: the collection also includes marketing and email examples. |
| [Baymard examples](https://baymard.com/ecommerce-design-examples) and [UX benchmark](https://baymard.com/ux-benchmark) | Annotated positive and negative examples and research-backed commerce criteria help evaluate relevant shopping tasks. | Strongest fit is commerce, not every product; broader access is paid. Transfer only findings applicable to the target task. |

## Guideline families with illustrated examples

Sources checked on 2026-09-29. Inspect their current examples when using them; maintenance and publication do not certify a particular design's quality.

| Source | Useful questions and mechanisms | Applicability limit |
| --- | --- | --- |
| [Carbon typography](https://carbondesignsystem.com/elements/typography/overview/) and [data-table usage](https://carbondesignsystem.com/components/data-table/usage/) | Distinguishes productive task UI from expressive editorial treatments. Table examples show consistent headers and rows, adequate content width, selection and batch actions, and disclosure of supporting detail. Use to examine scanning and action hierarchy in information-heavy work. | Adopt the relevant mechanism, not Carbon's fonts, sizing, or density by default. |
| [Fluent layout](https://fluent2.microsoft.design/layout) and [typography](https://fluent2.microsoft.design/typography) | Illustrated grouping, spacing, and alignment explain how proximity communicates relationships. Context-dependent grids and semantic text roles help distinguish navigation, content, and supporting information. | Preserve the target platform's layout and font conventions; a Fluent example does not require a Fluent visual identity. |
| [Material canonical layouts](https://m3.material.io/foundations/layout/canonical-examples/overview) | Feed, list-detail, and supporting-pane patterns help compare how content and relationships adapt across compact, medium, and expanded layouts. | Use for the matching content model, not as a compulsory app structure. This source required JavaScript during research; inspect accessible rendered examples before claiming visual evidence from it. |
| [Nielsen Norman Group visual-design principles](https://www.nngroup.com/articles/principles-visual-design/) and [usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) | Scale, hierarchy, balance, contrast, and grouping provide vocabulary for explaining visual effects. Status, control, consistency, and error prevention help assess whether actions and outcomes are understandable. | Visual composition and usability are separate judgments; a pleasing screenshot cannot prove interaction quality. |

## Compare the actual draft

Use the relevant rows below to compare the rendered draft beside the inspected reference and current target, against the brief's targets. Name the element and discrepancy, then the correction or reason to accept it. These are qualitative judgments, not a numerical score or a requirement to maximize every trait.

### Worked translation (synthetic)

This example illustrates reasoning, not an inspected screenshot, an actual draft review, or usability proof.

| Step | Example |
| --- | --- |
| Task problem | In a settings form, users need to distinguish fields for the current section from the start of the next section. |
| Source mechanism | Refactoring UI's public instruction explains that excessive borders add clutter and suggests spacing or contrasting backgrounds as alternatives. This is craft instruction; applying it to this form is an inference. |
| Visible target | Related labels and inputs form clear groups through proximity; section headings and larger gaps mark boundaries. Retain the project's typography and field outlines that identify editable controls. |
| Hypothetical draft discrepancy → correction | A border around every row competes with the section boundary, while equal gaps make every separation look equivalent. Remove redundant row separators and give section boundaries more space than gaps within a group. |
| Check | Compare equal-content before/after renders with realistic labels at the intended viewing size: are section boundaries clear and fields still recognizable? Record remaining discrepancies; this visual check does not establish that users complete the task more successfully. |

### Qualities to examine

| Quality | Evidence that it serves the task | Signs the draft remains rough |
| --- | --- | --- |
| Hierarchy | The intended content or action attracts attention first; supporting material reads as secondary. | Several unrelated elements compete equally, or decoration outranks the primary task. |
| Typography | Text roles repeat consistently; important distinctions survive realistic text and the intended viewing size. | Arbitrary size/weight changes, cramped wrapping, or supporting text that becomes unreadable. |
| Grouping and rhythm | Proximity and repeated alignment make relationships apparent; spacing marks meaningful changes of group. | Related items drift apart, unrelated controls appear grouped, or repeated rows lose their rhythm. |
| Composition and density | Space allocation supports scanning or focus appropriate to the task; secondary regions justify their footprint. | Oversized chrome crowds useful content, accidental gaps dominate, or content is compressed without a task benefit. |
| State and action clarity | Selection, current status, available actions, and recovery paths are distinguishable in the relevant states. | Actions compete without priority, status resembles decoration, or empty/error/selected states leave the next step unclear. |
| Craft and identity | Icons, imagery, surfaces, and optical alignment form a coherent project-specific treatment. | Nearly matching glyphs, inconsistent edges or treatments, awkward crops, or a generic style that ignores the approved visual system. |

Before presenting, inspect finished exports at their intended viewing size and fix observable deficiencies against these targets. When independent review is required, the visual critic receives the artifact, reference evidence, and criteria without the author's rationale or self-assessment. Ask for concrete discrepancies and whether the result is ready for the requested decision. A node count, clean native structure, or absence of blocking defects cannot settle that judgment. An explicitly requested rough exploration can be reviewed as such; do not describe it as a finished reference.
