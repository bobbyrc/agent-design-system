import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { hasVisibleFocus } from "./focus.mjs";
const execute = promisify(execFile);

// Exercise the real executable and aggregate, not a duplicate implementation
// of its contract selection. Keep mutated contracts out of the working tree.
test("full runner selects renamed review methods and records declared narrow navigation outcomes", { timeout: 120000 }, async () => {
  const root = process.cwd(), temp = fs.mkdtempSync(path.join(os.tmpdir(), "runner-contract-"));
  try {
    for (const name of ["examples", "scripts", "contracts", "package.json", "package-lock.json"])
      fs.cpSync(path.join(root, name), path.join(temp, name), { recursive: true });
    fs.symlinkSync(path.join(root, "node_modules"), path.join(temp, "node_modules"), "dir");
    const file = path.join(temp, "examples/equipment/acceptance.json");
    const contract = JSON.parse(fs.readFileSync(file, "utf8"));
    const review = contract.checks.find(check => check.method === "independent_actual_image_review");
    review.id = "RENAMED-IMAGE-REVIEW";
    contract.checks.push({ ...review, id: "SECOND-IMAGE-REVIEW" });
    fs.writeFileSync(file, JSON.stringify(contract));
    const { stdout } = await execute(process.execPath, ["scripts/verify-equipment.mjs", "--machine-only"],
      { cwd: temp, timeout: 110000, maxBuffer: 2 ** 20 });
    const summary = JSON.parse(stdout);
    assert.equal(summary.result, "PASS");
    assert.equal(summary.full_result, "BLOCKED");
    const run = JSON.parse(fs.readFileSync(path.join(temp, summary.run)));
    assert.deepEqual(run.checks.map(check => check.id).sort(), contract.checks.map(check => check.id).sort());
    for (const id of ["RENAMED-IMAGE-REVIEW", "SECOND-IMAGE-REVIEW"]) {
      const check = run.checks.find(check => check.id === id);
      assert.equal(check.result, "BLOCKED");
      assert.equal(check.executed, false);
      assert.equal(check.evidence.length, 55);
    }
    const narrow = run.checks.find(check => check.id === "NARROW-01");
    const evidence = JSON.parse(fs.readFileSync(path.join(temp, narrow.evidence[0]))).assertions;
    assert.equal(evidence.coverage.length, 20);
    assert.equal(new Set(evidence.coverage.map(item => item.width)).size, 10);
    for (const item of evidence.coverage) {
      assert.deepEqual(item.queueClippedControls, []);
      assert.deepEqual(item.detailClippedControls, []);
    }
    assert.equal(evidence.navigationCoverage.length, 9);
    assert.equal(evidence.navigationCoverage.filter(item => item.type === "reported_selection_resize_then_back").length, 2);
    assert.equal(evidence.navigationCoverage.filter(item => item.type === "completed_outcome_does_not_reopen_on_resize").length, 2);
    const backs = evidence.navigationCoverage.filter(item => item.type === "browser_back_before_pending_and_after_return");
    assert.deepEqual(backs.map(item => item.completed.focus).sort(), ["loan-kit-12", "search"]);
    for (const item of backs) {
      assert.equal(item.completed.events, 1);
      assert.equal(hasVisibleFocus(item.inspected.focusEvidence), true);
      assert.equal(hasVisibleFocus(item.completed.focusEvidence), true);
    }
    const resize = evidence.navigationCoverage.find(item => item.type === "inspection_resize_and_browser_back");
    assert.deepEqual(resize.widths, [901, 899, 901, 899]);
    assert.equal(hasVisibleFocus(resize.widenedFocusEvidence), true);
    const outcomes = evidence.navigationCoverage.filter(item => item.type === "pending_resize_outcome_retry_and_browser_back");
    assert.equal(outcomes.length, 2);
    for (const item of outcomes) {
      assert.equal(item.after.events.length, 1);
      assert.equal(hasVisibleFocus(item.pendingFocusEvidence), true);
      assert.equal(hasVisibleFocus(item.outcomeFocusEvidence), true);
    }
    for (const item of evidence.navigationCoverage.filter(item => item.focusEvidence))
      assert.equal(hasVisibleFocus(item.focusEvidence), true);

    let failure;
    try {
      await execute(process.execPath, ["scripts/verify-equipment.mjs", "--machine-only"],
        { cwd: temp, env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(temp, "missing-browsers") }, timeout: 10000 });
    } catch (error) { failure = error; }
    assert.ok(failure, "missing browser must fail closed");
    const blocked = JSON.parse(failure.stdout);
    assert.equal(blocked.result, "BLOCKED");
    const failedRun = JSON.parse(fs.readFileSync(path.join(temp, blocked.run)));
    assert.deepEqual(failedRun.checks.map(check => check.id).sort(), contract.checks.map(check => check.id).sort());
    assert.ok(failedRun.checks.every(check => check.result === "BLOCKED" && check.executed === false));
    for (const id of ["RENAMED-IMAGE-REVIEW", "SECOND-IMAGE-REVIEW"])
      assert.match(failedRun.checks.find(check => check.id === id).reason, /independent current-image review/);
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
});
