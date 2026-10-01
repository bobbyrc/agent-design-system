import fs from "node:fs";
import path from "node:path";
import {
  aggregate,
  identity,
  validateReview,
  sha,
  safeFile,
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
    fs.writeFileSync(target, JSON.stringify(review, null, 2) + "\n", {
      flag: "wx",
    });
    run.review = {
      path: path.relative(root, target),
      sha256: sha(fs.readFileSync(target)),
    };
    const check = run.checks.find((c) => c.id === "VISUAL-01");
    check.result = passed ? "PASS" : "FAIL";
    check.executed = true;
    check.reason = passed
      ? "Current-image independent review recorded; local CLI cannot prove inspection or independence"
      : "Review has unresolved findings";
    check.evidence = run.artifacts
      .filter((x) => x.kind === "image")
      .map((x) => x.path);
    run.result = run.checks.some((c) => c.result === "FAIL")
      ? "FAIL"
      : run.checks.some((c) => c.result === "BLOCKED")
        ? "BLOCKED"
        : "PASS";
    aggregate(root, run, current);
    fs.writeFileSync(runPath, JSON.stringify(run, null, 2) + "\n");
  }
  const outcome = aggregate(root, run, current);
  console.log(JSON.stringify(outcome));
  process.exitCode = outcome.result === "PASS" ? 0 : 1;
} catch (error) {
  console.error(`Evidence rejected: ${error.message}`);
  process.exitCode = 1;
}
