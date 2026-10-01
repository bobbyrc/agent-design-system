import fs from "node:fs";
import path from "node:path";
import {
  aggregate,
  identity,
  validateReview,
  sha,
  safeFile,
  reviewCheckIds,
} from "./evidence.mjs";
const root = process.cwd();
try {
  const [command, runFile, reviewFile] = process.argv.slice(2);
  if (
    !["check", "review"].includes(command) ||
    !runFile ||
    (command === "review" && !reviewFile)
  )
    throw new Error(
      "Usage: node scripts/evidence-cli.mjs check <run.json> | review <run.json> <reviewer.json>",
    );
  const runPath = safeFile(root, path.relative(root, path.resolve(runFile)));
  const run = JSON.parse(fs.readFileSync(runPath));
  const current = identity(root);
  aggregate(root, run, current);
  if (command === "review") {
    const review = JSON.parse(fs.readFileSync(reviewFile));
    const passed = validateReview(review, run);
    const target = path.join(path.dirname(runPath), "independent-review.json");
    if (fs.existsSync(target))
      throw new Error(
        "Review already exists; create a fresh run instead of overwriting review",
      );
    const bytes = Buffer.from(JSON.stringify(review, null, 2) + "\n");
    const candidate = structuredClone(run);
    candidate.review = {
      path: path.relative(root, target),
      sha256: sha(bytes),
    };
    const ids = reviewCheckIds(current.contract);
    for (const check of candidate.checks.filter((c) => ids.includes(c.id))) {
      check.result = passed ? "PASS" : "FAIL";
      check.executed = true;
      check.reason = passed
        ? "Current-image independent review recorded; local CLI cannot prove inspection or independence"
        : "Review has unresolved findings";
      check.evidence = candidate.artifacts
        .filter((x) => x.kind === "image")
        .map((x) => x.path);
    }
    candidate.result = candidate.checks.some((c) => c.result === "FAIL")
      ? "FAIL"
      : candidate.checks.some((c) => c.result === "BLOCKED")
        ? "BLOCKED"
        : "PASS";
    // Validate the complete candidate before publishing either file.
    aggregate(root, candidate, current, { reviewBytes: bytes });
    const temporary = `${runPath}.review-${process.pid}.tmp`;
    const reviewTemporary = `${target}.${process.pid}.tmp`;
    let published = false;
    try {
      fs.writeFileSync(temporary, JSON.stringify(candidate, null, 2) + "\n", {
        flag: "wx",
      });
      fs.writeFileSync(reviewTemporary, bytes, { flag: "wx" });
      fs.linkSync(reviewTemporary, target);
      published = true;
      fs.renameSync(temporary, runPath);
    } catch (error) {
      if (published) fs.unlinkSync(target);
      throw error;
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
      if (fs.existsSync(reviewTemporary)) fs.unlinkSync(reviewTemporary);
    }
    Object.assign(run, candidate);
  }
  const outcome = aggregate(root, run, current);
  console.log(JSON.stringify(outcome));
  process.exitCode = outcome.result === "PASS" ? 0 : 1;
} catch (error) {
  console.error(`Evidence rejected: ${error.message}`);
  process.exitCode = 1;
}
