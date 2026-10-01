import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { aggregate, identity, artifact, binding, REVIEW_METHOD } from "./evidence.mjs";
import { startServer } from "./server.mjs";
import { tabFocusSample, hasVisibleFocus, snapshotFocusStyles, currentFocusSample } from "./focus.mjs";
import { restrictToOrigin, submitWhilePending, clippedInteractiveContent } from "./runner-browser.mjs";
const require = createRequire(import.meta.url),
  root = process.cwd(),
  current = identity(root);
const REVIEW_CHECKS = current.contract.checks.filter((check) => check.method === REVIEW_METHOD);
const MACHINE_CHECKS = current.contract.checks.filter((check) => check.method !== REVIEW_METHOD);
let commit = null;
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {}
const run = {
  artifact: {
    commit,
    working_tree_or_build_hash: current.source_hash,
    source_files: current.source,
  },
  schema: "ui-run/v1",
  illustrative_only: false,
  run_id: crypto.randomUUID(),
  acceptance_contract_id: current.contract.id,
  source_hash: current.source_hash,
  contract_hash: current.contract_hash,
  fixture_hash: current.fixture_hash,
  fixture_version: current.fixture_version,
  integration_mode: "prototype_mock",
  execution_started_at: new Date().toISOString(),
  execution_finished_at: null,
  environment: {
    host: "standalone-node-playwright",
    host_version: process.version,
    platform: os.platform(),
    architecture: os.arch(),
    os_release: os.release(),
    browser_version: "not launched",
    tool_versions: {
      node: process.version,
      playwright: require("playwright/package.json").version,
      axe: require("axe-core/package.json").version,
    },
    model: null,
    skill_revision: null,
  },
  provenance: {
    protected_evaluator: false,
    served_build_identity: current.source_hash,
    trust_boundary_note:
      "Builder-writable teaching runner; not protected evaluation. Store corroborates UI only.",
  },
  artifacts: [],
  checks: [],
  review: null,
  result: "BLOCKED",
  gaps: [
    "Independent actual-image review not yet recorded",
    "Standalone Chromium only; no screen-reader/manual conformance or all-host evidence",
  ],
};
const out = `artifacts/ui-runs/${run.run_id}`;
fs.mkdirSync(path.join(root, out), { recursive: true });
const runtime = [],
  network = [],
  scans = [],
  captures = [],
  assertions = {};
let server, browser;
function write(name, data, kind = "assertions") {
  const rel = `${out}/${name}`;
  fs.writeFileSync(path.join(root, rel), JSON.stringify(data, null, 2) + "\n");
  run.artifacts.push(artifact(root, rel, run, kind));
  return rel;
}
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const rel = `${out}/${name}.png`;
  await page.screenshot({
    path: path.join(root, rel),
    fullPage: true,
    animations: "disabled",
  });
  run.artifacts.push({
    ...artifact(root, rel, run, "image"),
    state: name,
    width: page.viewportSize().width,
  });
  captures.push({
    captured_at: new Date().toISOString(),
    state: name,
    width: page.viewportSize().width,
    path: rel,
    sha256: run.artifacts.at(-1).sha256,
    masks: [],
    motion: "reduced; screenshot animations disabled",
  });
  return rel;
}
async function scan(page, state) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const options = {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    },
    preload: false,
  };
  let result;
  if (page.captureClockPaused) {
    await page.evaluate((options) => {
      window.__axeCaptureResult = null;
      window.axe.run(document, options).then((result) => {
        window.__axeCaptureResult = result;
      });
    }, options);
    for (let tick = 0; tick < 200; tick++) {
      await page.clock.runFor(1);
      result = await page.evaluate(() => window.__axeCaptureResult);
      if (result) break;
    }
    assert.ok(result, "axe did not finish within200ms of captured-state clock");
  } else {
    result = await page.evaluate(
      async (options) => await window.axe.run(document, options),
      options,
    );
  }
  const findings = result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes,
    disposition: "unresolved",
    rationale:
      "Must repair or explicitly triage; automatic approval is prohibited",
  }));
  scans.push({
    state,
    width: page.viewportSize().width,
    violations: findings,
    incomplete: result.incomplete.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes,
      disposition: "manual_review_required",
      rationale:
        "Automated scan cannot resolve this check; independent image/keyboard review scope only",
    })),
    passes: result.passes.map((x) => x.id),
  });
}
async function capture(page, state, { a11y = true } = {}) {
  await shot(page, state);
  if (a11y) await scan(page, state);
}
const t = (page, id) => page.getByTestId(id);
async function store(page) {
  return page.evaluate(() => window.equipmentStore());
}
async function ready(page, scenario = "") {
  await page.goto(
    `${server.url}${current.contract.route}${scenario ? `?scenario=${scenario}` : ""}`,
  );
  await page.waitForFunction(() => typeof window.equipmentStore === "function");
  if (scenario !== "loading")
    await page.waitForFunction(
      () =>
        document.getElementById("queue-content").getAttribute("aria-busy") ===
        "false",
    );
}
async function fresh(width = 1440, scenario = "") {
  const page = await browser.newPage({
    viewport: {
      width,
      height: width === 768 ? 1024 : width <= 390 ? 844 : 900,
    },
    reducedMotion: "reduce",
    locale: "en-GB",
    timezoneId: "UTC",
  });
  page.setDefaultTimeout(10000);
  await restrictToOrigin(page, server.url, network);
  page.on("pageerror", (e) =>
    runtime.push({ url: page.url(), message: e.message }),
  );
  page.on("console", (m) => {
    if (m.type() === "error")
      runtime.push({ url: page.url(), message: m.text() });
  });
  page.on("requestfailed", (r) =>
    network.push({
      url: r.url(),
      failure: r.failure(),
      first_party: new URL(r.url()).origin === server.url,
    }),
  );
  page.on("response", (r) => {
    if (r.status() >= 400)
      network.push({
        url: r.url(),
        status: r.status(),
        first_party: new URL(r.url()).origin === server.url,
      });
  });
  if (scenario === "loading") {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    page.captureClockPaused = true;
  }
  await ready(page, scenario);
  return page;
}
async function open(page, id = "kit-12") {
  await t(page, `loan-${id}`).click();
  await t(page, "detail").waitFor({ state: "visible" });
}
async function checks(page) {
  for (const id of ["recorder", "microphone", "cables"])
    await t(page, `check-${id}`).check();
}
async function succeeded(page) {
  await page.waitForFunction(
    () =>
      window.equipmentStore().loans.find((x) => x.id === "kit-12").status ===
      "returned",
  );
  assert.match(
    await t(page, "return-status").innerText(),
    /Return recorded|now available/i,
  );
  const s = await store(page);
  assert.equal(
    s.events.filter((x) => x.loanId === "kit-12" && x.type === "returned")
      .length,
    1,
  );
  assert.equal(s.loans.find((x) => x.id === "kit-12").status, "returned");
  return s;
}
async function runCheck(id, fn) {
  const start = new Date().toISOString();
  try {
    const data = await fn();
    const evidence = write(`${id}.json`, {
      ...binding(run),
      id,
      executed: true,
      started_at: start,
      finished_at: new Date().toISOString(),
      assertions: data,
    });
    run.checks.push({
      id,
      result: "PASS",
      executed: true,
      reason: "Executed assertions passed",
      evidence: [evidence],
    });
  } catch (e) {
    const evidence = write(`${id}.json`, {
      ...binding(run),
      id,
      executed: true,
      started_at: start,
      finished_at: new Date().toISOString(),
      error: e.stack,
      diagnostics: e.diagnostics || null,
    });
    run.checks.push({
      id,
      result: "FAIL",
      executed: true,
      reason: e.message,
      evidence: [evidence],
    });
    console.error(`${id}: ${e.message}`);
  }
}
try {
  server = await startServer(root, current);
  browser = await chromium.launch();
  run.environment.browser_version = browser.version();
  await runCheck("TASK-RETURN-01", async () => {
    const page = await fresh();
    assert.equal(await t(page, "queue-count").innerText(), "6");
    const before = await store(page);
    assert.equal(before.loans.length, 9);
    assert.equal(before.events.length, 0);
    assert.equal(
      before.loans.find((x) => x.id === "kit-12").borrower,
      "Mina Patel",
    );
    await t(page, "scope-overdue").click();
    await t(page, "search").fill("Mina");
    assert.equal(await page.locator('[data-testid^="loan-"]').count(), 1);
    await open(page);
    assert.match(await t(page, "detail").innerText(), /Field recording kit 12/);
    assert.match(await t(page, "detail").innerText(), /Mina Patel/);
    assert.match(await t(page, "detail").innerText(), /28 Sep/);
    await checks(page);
    await t(page, "return-submit").click();
    const after = await succeeded(page);
    await t(page, "search").fill("");
    assert.equal(await t(page, "queue-count").innerText(), "5");
    await shot(page, "task-return-completed");
    await page.close();
    return {
      known_fixture: {
        loanId: "kit-12",
        borrower: "Mina Patel",
        overdue_before: 6,
        overdue_after: 5,
      },
      before,
      after,
    };
  });
  await runCheck("RETURN-FAIL-01", async () => {
    const page = await fresh(1440, "save-failure");
    await open(page);
    await checks(page);
    const before = await store(page);
    await t(page, "return-submit").click();
    await page.waitForFunction(() =>
      document
        .querySelector('[data-testid="return-status"]')
        .textContent.includes("Could not save"),
    );
    for (const id of ["recorder", "microphone", "cables"])
      assert.equal(await t(page, `check-${id}`).isChecked(), true);
    const failed = await store(page);
    assert.deepEqual(failed.loans, before.loans);
    assert.deepEqual(failed.events, before.events);
    assert.equal(failed.pending, false);
    await t(page, "return-submit").click();
    const after = await succeeded(page);
    await page.close();
    return { before, failed, after, retained_checks: true, retry: true };
  });
  await runCheck("DUPLICATE-01", async () => {
    const page = await fresh();
    await open(page);
    await checks(page);
    const attempts = await submitWhilePending(page);
    assert.equal(attempts.submissions, 3, "all repeated attempts must reach submit handler");
    assert.equal(attempts.pending, true);
    assert.equal(attempts.events, 0, "save timer is held before inspecting pending state");
    assert.equal(await t(page, "return-submit").isDisabled(), true);
    await page.clock.runFor(700);
    await page.clock.resume();
    const after = await succeeded(page);
    assert.equal(after.events.length, 1);
    await page.close();
    return { after, activation_attempts: attempts.submissions, pending_lock: true };
  });
  await runCheck("NARROW-01", async () => {
    const coverage = [];
    for (const width of [
      ...current.contract.viewports.map((x) => x.width),
      ...current.contract.additional_widths,
    ]) {
      for (const scenario of ["", "long-content"]) {
        const page = await fresh(width, scenario);
        await snapshotFocusStyles(page);
        let restoredFocusEvidence = null;
        const queueClippedControls = await clippedInteractiveContent(page);
        assert.deepEqual(queueClippedControls, [], `queue controls clip ${width}/${scenario}`);
        await t(page, "search").fill("Mina");
        await t(page, "scope-overdue").click();
        await open(page);
        const geometry = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        assert.ok(
          geometry.scroll <= geometry.client + 1,
          `page overflow ${width}/${scenario}`,
        );
        assert.equal(await t(page, "return-submit").isVisible(), true);
        assert.match(await t(page, "detail").innerText(), /Mina/);
        assert.match(await t(page, "detail").innerText(), /28 Sep/);
        const detailClippedControls = await clippedInteractiveContent(page);
        assert.deepEqual(detailClippedControls, [], `detail controls clip ${width}/${scenario}`);
        await shot(page, `reflow-${width}-${scenario || "standard"}`);
        if (width < 900) {
          await page.keyboard.press("Escape");
          await t(page, "back-to-queue").focus();
          await page.keyboard.press("Enter");
          await page.waitForFunction(() => document.activeElement?.dataset.testid === "loan-kit-12");
          assert.equal(await t(page, "search").inputValue(), "Mina");
          assert.equal(
            await t(page, "scope-overdue").getAttribute("aria-pressed"),
            "true",
          );
          assert.equal(
            await page.evaluate(() => document.activeElement?.dataset.testid),
            "loan-kit-12",
          );
          restoredFocusEvidence = await currentFocusSample(page);
          assert.ok(hasVisibleFocus(restoredFocusEvidence), `Back focus must be visible ${width}/${scenario}`);
        }
        coverage.push({ width, scenario: scenario || "standard", geometry, queueClippedControls, detailClippedControls, restoredFocusEvidence });
        await page.close();
      }
    }
    const navigationCoverage = [];
    async function keyboardNavigationPage(width, scenario = "") {
      const page = await fresh(width, scenario);
      // An unfocused baseline rejects decorative shadows and survives row renders.
      await snapshotFocusStyles(page);
      return page;
    }
    async function keyboardModality(page) {
      // Real keyboard input establishes the modality before app-driven restoration.
      // Escape does not activate controls or mutate this workflow.
      await page.keyboard.press("Escape");
    }
    async function restoredFocus(page, id) {
      const sample = await currentFocusSample(page);
      assert.equal(sample.id, id);
      if (!hasVisibleFocus(sample)) {
        const error = new Error(`restored ${id} must be visible with a changed focus indicator`);
        error.diagnostics = { focus: sample };
        throw error;
      }
      return sample;
    }
    // Execute history and viewport transitions here: browser-suite success is
    // not evidence that this acceptance run exercised its declared outcomes.
    async function queueRestored(page, scope, focus, events) {
      await page.waitForFunction(id => document.body.dataset.view === "queue" &&
        document.activeElement?.dataset.testid === id, focus);
      assert.equal(await t(page, "search").inputValue(), "Mina");
      assert.equal(await t(page, `scope-${scope}`).getAttribute("aria-pressed"), "true");
      assert.equal((await store(page)).events.length, events);
      assert.deepEqual(await clippedInteractiveContent(page), []);
      const focusEvidence = await restoredFocus(page, focus);
      return { view: "queue", query: "Mina", scope, focus, events, focusEvidence };
    }
    for (const scope of ["all", "overdue"]) {
      const page = await keyboardNavigationPage(390, "long-content");
      await t(page, `scope-${scope}`).click();
      await t(page, "search").fill("Mina");
      await open(page);
      await keyboardModality(page);
      await page.goBack();
      const inspected = await queueRestored(page, scope, "loan-kit-12", 0);
      await open(page);
      await checks(page);
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await t(page, "return-submit").click();
      await keyboardModality(page);
      await page.goBack();
      await page.waitForFunction(() => history.state.equipmentView === "detail");
      assert.equal((await store(page)).pending, true);
      assert.equal(await t(page, "detail").isVisible(), true);
      await page.clock.runFor(700);
      await page.clock.resume();
      const after = await succeeded(page);
      await keyboardModality(page);
      await page.goBack();
      const completed = await queueRestored(page, scope, scope === "all" ? "loan-kit-12" : "search", 1);
      navigationCoverage.push({ type: "browser_back_before_pending_and_after_return", width: 390,
        scenario: "long-content", inspected, pending_back_guard: true, completed, after });
      await page.close();
    }
    {
      const page = await keyboardNavigationPage(901, "long-content");
      await t(page, "scope-all").click();
      await t(page, "search").fill("Mina");
      await open(page);
      await t(page, "check-recorder").focus();
      await keyboardModality(page);
      await page.setViewportSize({ width: 899, height: 900 });
      const narrowed = await queueRestored(page, "all", "loan-kit-12", 0);
      await open(page);
      await t(page, "back-to-queue").focus();
      await keyboardModality(page);
      await page.setViewportSize({ width: 901, height: 900 });
      await page.waitForFunction(() => document.activeElement?.id === "detail-title");
      assert.equal(await t(page, "detail").isVisible(), true);
      const widenedFocusEvidence = await restoredFocus(page, "detail-title");
      // Repeat crossing, then use real browser Back on the retained detail entry.
      await t(page, "check-recorder").focus();
      await keyboardModality(page);
      await page.setViewportSize({ width: 899, height: 900 });
      await queueRestored(page, "all", "loan-kit-12", 0);
      await keyboardModality(page);
      await page.goBack();
      const historyAfterResize = await queueRestored(page, "all", "loan-kit-12", 0);
      navigationCoverage.push({ type: "inspection_resize_and_browser_back", widths: [901, 899, 901, 899],
        narrowed, widened_focus: "detail-title", widenedFocusEvidence, historyAfterResize });
      await page.close();
    }
    for (const scenario of ["", "save-failure"]) {
      const page = await keyboardNavigationPage(901, scenario);
      await t(page, "scope-all").click();
      await t(page, "search").fill("Mina");
      await open(page);
      await checks(page);
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await t(page, "return-submit").click();
      await keyboardModality(page);
      await page.setViewportSize({ width: 899, height: 900 });
      await page.waitForFunction(() => document.body.dataset.view === "detail" &&
        document.activeElement?.dataset.testid === "return-status");
      assert.equal((await store(page)).pending, true);
      const pendingFocusEvidence = await restoredFocus(page, "return-status");
      await page.clock.runFor(700);
      const focus = scenario ? "return-submit" : "return-status";
      await page.waitForFunction(id => document.activeElement?.dataset.testid === id, focus);
      assert.equal(await t(page, focus).isVisible(), true);
      const outcomeFocusEvidence = await restoredFocus(page, focus);
      assert.match(await t(page, "return-status").innerText(), scenario ? /Could not save/ : /Return recorded/);
      const outcome = await store(page);
      assert.equal(outcome.events.length, scenario ? 0 : 1);
      if (scenario) {
        for (const id of ["recorder", "microphone", "cables"])
          assert.equal(await t(page, `check-${id}`).isChecked(), true);
        await t(page, "return-submit").click();
        await page.clock.runFor(700);
      }
      await page.clock.resume();
      const after = await succeeded(page);
      await keyboardModality(page);
      await page.goBack();
      const completed = await queueRestored(page, "all", "loan-kit-12", 1);
      navigationCoverage.push({ type: "pending_resize_outcome_retry_and_browser_back", widths: [901, 899],
        scenario: scenario || "standard", pendingFocusEvidence, outcome_focus: focus, outcomeFocusEvidence, outcome, after, completed });
      await page.close();
    }
    for (const back of ["button", "browser"]) {
      const page = await keyboardNavigationPage(390);
      await open(page);
      await keyboardModality(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await t(page, "check-recorder").focus();
      await keyboardModality(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.body.dataset.view === "queue");
      await open(page, "kit-13");
      await keyboardModality(page);
      if (back === "button") {
        await t(page, "back-to-queue").focus();
        await page.keyboard.press("Enter");
      }
      else await page.goBack();
      await page.waitForFunction(() => document.body.dataset.view === "queue" &&
        document.activeElement?.dataset.testid === "loan-kit-13");
      assert.equal(await t(page, "detail").isVisible(), false);
      const focusEvidence = await restoredFocus(page, "loan-kit-13");
      assert.equal((await store(page)).events.length, 0);
      assert.deepEqual(await clippedInteractiveContent(page), []);
      navigationCoverage.push({ type: "reported_selection_resize_then_back", back,
        widths: [390, 1440, 390], selected: "kit-13", restored_view: "queue", focus: "loan-kit-13", focusEvidence });
      await page.close();
    }
    for (const origin of ["narrow_queue_all", "wide_search"]) {
      const page = await keyboardNavigationPage(origin === "wide_search" ? 1440 : 390);
      await open(page);
      await checks(page);
      await t(page, "return-submit").click();
      const after = await succeeded(page);
      if (origin === "narrow_queue_all") {
        await t(page, "back-to-queue").click();
        await page.waitForFunction(() => document.body.dataset.view === "queue");
        await t(page, "scope-all").click();
        await keyboardModality(page);
      await page.setViewportSize({ width: 1440, height: 900 });
        await t(page, "search").focus();
      } else {
        await t(page, "search").fill("Mina");
      }
      await keyboardModality(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.body.dataset.view === "queue");
      assert.equal(await t(page, "detail").isVisible(), false);
      const focus = await page.evaluate(() => document.activeElement?.dataset.testid);
      assert.equal(focus, "search");
      const focusEvidence = await restoredFocus(page, focus);
      assert.equal((await store(page)).events.length, 1);
      assert.deepEqual(await clippedInteractiveContent(page), []);
      navigationCoverage.push({ type: "completed_outcome_does_not_reopen_on_resize", origin,
        restored_view: "queue", focus, focusEvidence, after });
      await page.close();
    }
    const textCoverage = [];
    for (const width of [320, 390]) {
      const page = await fresh(width, "long-content");
      await open(page);
      const beforeSizes = await page.evaluate(() =>
        ["h1", ".detail-title", "[data-testid=search]", ".check-description"].map(
          (selector) => ({
            selector,
            size: parseFloat(
              getComputedStyle(document.querySelector(selector)).fontSize,
            ),
          }),
        ),
      );
      await page.addStyleTag({
        content:
          "html {font-size:200% !important} * {line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p {margin-bottom:2em !important}",
      });
      const textSizes = await page.evaluate(
        (before) =>
          before.map((x) => ({
            ...x,
            after: parseFloat(
              getComputedStyle(document.querySelector(x.selector)).fontSize,
            ),
          })),
        beforeSizes,
      );
      assert.ok(
        textSizes.every((x) => Math.abs(x.after - x.size * 2) < 0.1),
        "effective text font sizes must double",
      );
      const geometry = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      assert.ok(
        geometry.scroll <= geometry.client + 1,
        "enlarged/spaced text overflows page",
      );
      const clippedControls = await clippedInteractiveContent(page);
      assert.deepEqual(clippedControls, [], "enlarged text must not clip interactive content");
      await shot(page, `text-enlargement-spacing-${width}`);
      await t(page, "back-to-queue").click();
      await page.waitForFunction(() => document.body.dataset.view === "queue" &&
        document.activeElement?.dataset.testid === "loan-kit-12");
      const queueClippedControls = await clippedInteractiveContent(page);
      assert.deepEqual(queueClippedControls, [], "enlarged queue controls must not clip");
      await shot(page, `text-enlargement-queue-${width}`);
      await open(page);
      await checks(page);
      await t(page, "return-submit").click();
      await succeeded(page);
      await page.close();
      textCoverage.push({width, textSizes, geometry, clippedControls, queueClippedControls});
    }
    return {
      coverage,
      navigationCoverage,
      text_enlargement:
        "Measured glyph font sizes doubled plus WCAG text-spacing override; task completed",
      textCoverage,
    };
  });
  await runCheck("KEYBOARD-01", async () => {
    const page = await fresh(390);
    const focus = [];
    async function tabTo(id) {
      for (let n = 0; n < 40; n++) {
        const f = await tabFocusSample(page);
        focus.push(f);
        if (!hasVisibleFocus(f)) {
          const error = new Error("Tab focus must be visible");
          error.diagnostics = { focus };
          await shot(page, "keyboard-focus-failure");
          throw error;
        }
        if (f.id === id) return;
      }
      throw new Error(`Tab cannot reach ${id}`);
    }
    await tabTo("search");
    await page.keyboard.type("Mina");
    await tabTo("loan-kit-12");
    await page.keyboard.press("Enter");
    for (const id of ["check-recorder", "check-microphone", "check-cables"]) {
      await tabTo(id);
      await page.keyboard.press("Space");
    }
    await tabTo("return-submit");
    await shot(page, "keyboard-visible-focus");
    await page.keyboard.press("Enter");
    const after = await succeeded(page);
    await page.keyboard.press("Tab");
    const next = await page.evaluate(
      () =>
        document.activeElement?.dataset.testid ||
        document.activeElement?.tagName,
    );
    assert.notEqual(next, "BODY");
    await page.close();
    return {
      focus,
      after,
      focus_after_completion: next,
      inputs: "Tab/Space/Enter and typed search; zero pointer actions",
    };
  });
  await runCheck("A11Y-AUTO-01", async () => {
    for (const { width } of current.contract.viewports) {
      const prefix = `${width}`;
      let page = await fresh(width);
      await capture(page, `queue-${prefix}`);
      await open(page);
      await capture(page, `detail-${prefix}`);
      await checks(page);
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      page.captureClockPaused = true;
      await t(page, "return-submit").click();
      assert.equal((await store(page)).pending, true);
      await shot(page, `pending-${prefix}`);
      await scan(page, `pending-${prefix}`);
      assert.equal((await store(page)).pending, true);
      await page.clock.runFor(700);
      page.captureClockPaused = false;
      await page.clock.resume();
      await succeeded(page);
      await capture(page, `success-${prefix}`);
      await page.close();
      page = await fresh(width, "save-failure");
      await open(page);
      await checks(page);
      await t(page, "return-submit").click();
      await page.waitForFunction(() =>
        document
          .querySelector('[data-testid="return-status"]')
          .textContent.includes("Could not save"),
      );
      await capture(page, `failure-${prefix}`);
      await page.close();
      for (const state of ["empty", "loading", "long-content"]) {
        page = await fresh(width, state);
        if (state === "loading") {
          assert.equal(
            await page.locator("#queue-content").getAttribute("aria-busy"),
            "true",
          );
          await capture(page, `loading-${prefix}`);
          await page.clock.runFor(1300);
          page.captureClockPaused = false;
          await page.clock.resume();
          await page.waitForFunction(
            () =>
              typeof window.equipmentStore === "function" &&
              window.equipmentStore().loans.length === 9,
          );
          await t(page, "loan-kit-12").waitFor({ state: "visible" });
          await shot(page, `loading-ready-${prefix}`);
        } else {
          if (state === "long-content") await open(page);
          await capture(page, `${state}-${prefix}`);
        }
        await page.close();
      }
    }
    const page = await fresh();
    await t(page, "search").fill("no-known-matching-loan");
    assert.equal(await page.locator('[data-testid^="loan-"]').count(), 0);
    await capture(page, "no-matches-1440");
    await t(page, "search").fill("");
    assert.equal(await page.locator('[data-testid^="loan-"]').count(), 6);
    await open(page, "kit-17");
    assert.equal(await t(page, "check-microphone").isDisabled(), true);
    await t(page, "check-recorder").check();
    await t(page, "check-cables").check();
    assert.equal(await t(page, "return-submit").isDisabled(), true);
    assert.match(
      await t(page, "detail").innerText(),
      /missing|cannot|needs attention/i,
    );
    assert.equal((await store(page)).events.length, 0);
    await capture(page, "missing-accessory-1440");
    await page.close();
    const scanPath = write("axe-scans.json", scans, "accessibility");
    assert.equal(
      scans.flatMap((x) => x.violations).length,
      0,
      "axe violations require explicit triage/repair (see axe-scans.json)",
    );
    return {
      scan_evidence: scanPath,
      scanned_states: scans.map((x) => x.state),
      violation_count: 0,
      limitations:
        "Automated subset only. Incomplete checks are explicitly manual-review-required, not a conformance pass.",
    };
  });
} catch (e) {
  runtime.push({ message: e.stack, runner: true });
  for (const {id} of MACHINE_CHECKS)
    if (!run.checks.some((x) => x.id === id))
      run.checks.push({
        id,
        result: "BLOCKED",
        executed: false,
        reason: e.message,
        evidence: [],
      });
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
  const logs = write(
    "runtime-network.json",
    {
      runtime_errors: runtime,
      requests: network,
      served: server?.served || [],
      served_build_identity: current.source_hash,
    },
    "runtime",
  );
  write("capture-inventory.json", captures, "inventory");
  // Runtime failures invalidate every deterministic check; no extra hidden check IDs.
  if (runtime.length || network.some((x) => x.first_party || x.forbidden_external)) {
    for (const c of run.checks) {
      if (c.result === "PASS") {
        c.result = "FAIL";
        c.reason = "Runtime/console or prohibited/failed request errors";
      }
      c.evidence.push(logs);
    }
  }
  for (const {id} of REVIEW_CHECKS) run.checks.push({
    id,
    result: "BLOCKED",
    executed: false,
    reason:
      "Fresh independent current-image review has not been recorded; automated visual approval is prohibited",
    evidence: run.artifacts
      .filter((x) => x.kind === "image")
      .map((x) => x.path),
  });
  run.execution_finished_at = new Date().toISOString();
  run.result = run.checks.some((x) => x.result === "FAIL") ? "FAIL" : "BLOCKED";
  fs.writeFileSync(
    path.join(root, out, "run.json"),
    JSON.stringify(run, null, 2) + "\n",
  );
  try {
    const result = aggregate(root, run, identity(root), {
      machineOnly: process.argv.includes("--machine-only"),
    });
    console.log(
      JSON.stringify(
        {
          ...result,
          run: `${out}/run.json`,
          checks: run.checks.map(({ id, result }) => ({ id, result })),
        },
        null,
        2,
      ),
    );
    process.exitCode = result.result === "PASS" ? 0 : 1;
  } catch (e) {
    console.error(`Evidence rejected: ${e.message}; run ${out}/run.json`);
    process.exitCode = 1;
  }
}
