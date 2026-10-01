import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { identity } from "./evidence.mjs";
import { startServer } from "./server.mjs";

const root = process.cwd();
const t = (page, id) => page.getByTestId(id);
async function withApp(width, fn, { scenario = "", fixture = null, failedLoad = false, clock = false } = {}) {
  const server = await startServer(root, identity(root));
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(5000);
    if (clock) { await page.clock.install(); await page.clock.pauseAt(new Date()); }
    if (failedLoad || fixture) await page.route("**/fixtures.json", route => route.fulfill(failedLoad ?
      { status: 500, body: "Fixture unavailable" } :
      { status: 200, contentType: "application/json", body: JSON.stringify(fixture) }));
    await page.goto(`${server.url}/examples/equipment/index.html${scenario ? `?scenario=${scenario}` : ""}`);
    await page.waitForFunction(() => typeof window.equipmentStore === "function");
    if (scenario !== "loading") await page.locator('#queue-content[aria-busy="false"]').waitFor();
    await fn(page, server);
  } finally { if (browser) await browser.close(); await server.close(); }
}
async function checkKit(page) {
  for (const key of ["recorder", "microphone", "cables"]) await t(page, `check-${key}`).check();
}
async function returned(page) {
  await page.waitForFunction(() => window.equipmentStore().events.length === 1);
}

test("load failure keeps counts unknown, filters locked and error intact under synthetic events", async () => {
  await withApp(1440, async page => {
    assert.match(await page.locator("#queue-content").innerText(), /Could not load/);
    for (const id of ["search", "scope-all", "scope-overdue"]) assert.equal(await t(page, id).isDisabled(), true);
    await t(page, "search").evaluate(input => { input.value = "x"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await t(page, "scope-all").dispatchEvent("click");
    assert.match(await page.locator("#queue-content").innerText(), /Could not load/);
    assert.equal(await page.locator("#all-total").innerText(), "–");
    assert.equal(await page.locator("#queue-summary").innerText(), "Loan counts unavailable");
  }, { failedLoad: true });
});

test("loading locks search and scopes until ready and announces singular matches", async () => {
  await withApp(390, async page => {
    assert.equal(await t(page, "queue-count").innerText(), "–");
    for (const id of ["search", "scope-all", "scope-overdue"]) assert.equal(await t(page, id).isDisabled(), true);
    await t(page, "search").evaluate(input => { input.value = "Mina"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    assert.equal(await t(page, "queue-count").innerText(), "–");
    await page.clock.runFor(1300);
    await t(page, "loan-kit-12").waitFor();
    assert.equal(await t(page, "loan-kit-12").getAttribute("aria-current"), null);
    await t(page, "search").fill("Mina");
    assert.equal(await page.locator("#announcer").innerText(), "1 matching loan.");
  }, { scenario: "loading", clock: true });
});

test("Clear search cannot change filters during pending save and is restored after failure", async () => {
  await withApp(1440, async page => {
    await t(page, "search").fill("zzz");
    await checkKit(page);
    await t(page, "return-submit").click();
    assert.equal(await page.locator("#empty-action").isDisabled(), true);
    await page.locator("#empty-action").dispatchEvent("click");
    assert.equal(await t(page, "search").inputValue(), "zzz");
    assert.equal(await page.locator('[data-testid^="loan-"]').count(), 0);
    await page.clock.runFor(700);
    assert.match(await t(page, "return-status").innerText(), /Could not save/);
    assert.equal(await page.locator("#empty-action").isDisabled(), false);
    await page.locator("#empty-action").click();
    assert.equal(await t(page, "search").inputValue(), "");
    assert.equal(await t(page, "search").evaluate(el => el === document.activeElement), true);
    assert.equal((await page.evaluate(() => window.equipmentStore())).events.length, 0);
  }, { scenario: "save-failure", clock: true });
});

test("narrow browser Back keeps filters and return events, restores row or Search focus, and guards pending Back", async () => {
  await withApp(390, async (page, server) => {
    await t(page, "scope-all").click();
    await t(page, "search").fill("Mina");
    await t(page, "loan-kit-12").click();
    await page.goBack();
    await page.waitForFunction(() => document.body.dataset.view === "queue");
    assert.equal(await t(page, "search").inputValue(), "Mina");
    assert.equal(await t(page, "scope-all").getAttribute("aria-pressed"), "true");
    assert.equal(await t(page, "loan-kit-12").evaluate(el => el === document.activeElement), true);
    await t(page, "loan-kit-12").click();
    await checkKit(page);
    await t(page, "return-submit").click();
    await page.goBack();
    await page.waitForFunction(() => history.state.equipmentView === "detail");
    assert.equal(await t(page, "detail").isVisible(), true);
    await page.clock.runFor(700);
    await returned(page);
    await page.goBack();
    await page.waitForFunction(() => document.body.dataset.view === "queue");
    assert.equal((await page.evaluate(() => window.equipmentStore())).events.length, 1);
    assert.equal(await t(page, "search").inputValue(), "Mina");
    assert.equal(await t(page, "loan-kit-12").evaluate(el => el === document.activeElement), true);
    assert.equal(page.url(), `${server.url}/examples/equipment/index.html?scenario=long-content`);
    await t(page, "scope-overdue").click();
    await t(page, "scope-all").click();
    await t(page, "loan-kit-12").click();
    await page.goBack();
    await page.waitForFunction(() => document.body.dataset.view === "queue");
  }, { clock: true, scenario: "long-content" });
  await withApp(390, async page => {
    await t(page, "search").fill("Mina");
    await t(page, "loan-kit-12").click(); await checkKit(page);
    await t(page, "return-submit").click(); await returned(page);
    await t(page, "back-to-queue").click();
    await page.waitForFunction(() => document.body.dataset.view === "queue");
    assert.equal(await t(page, "search").evaluate(el => el === document.activeElement), true);
  });
});

test("wide selection resized to narrow shows queue and moves hidden focus to selected row", async () => {
  await withApp(1440, async page => {
    await t(page, "loan-kit-13").click();
    await t(page, "check-recorder").focus();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => document.body.dataset.view === "queue" && document.activeElement?.dataset.testid === "loan-kit-13");
    assert.equal(await t(page, "detail").isVisible(), false);
    await t(page, "loan-kit-13").click();
    await t(page, "back-to-queue").focus();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => document.activeElement?.id === "detail-title");
    assert.equal(await t(page, "detail").isVisible(), true);
  });
});

test("missing accessory note names the same item that is disabled", async () => {
  const fixture = JSON.parse(fs.readFileSync(`${root}/examples/equipment/fixtures.json`, "utf8"));
  fixture.loans.find(loan => loan.id === "kit-17").missingAccessory = "cables";
  await withApp(1440, async page => {
    await t(page, "loan-kit-17").click();
    assert.equal(await t(page, "check-cables").isDisabled(), true);
    assert.equal(await t(page, "check-microphone").isDisabled(), false);
    assert.equal(await page.locator("#missing-accessory strong").innerText(), "Cables reported missing");
  }, { fixture });
});

test("320px doubled and spaced text keeps each scope control inside its clipping panel", async () => {
  await withApp(320, async page => {
    await page.addStyleTag({ content: "html {font-size:200% !important} * {line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p {margin-bottom:2em !important}" });
    const controls = await page.locator(".scope-controls button").evaluateAll(buttons => buttons.map(button => {
      const rect = button.getBoundingClientRect(), panel = button.closest(".queue-panel").getBoundingClientRect();
      return { left: rect.left, right: rect.right, panelLeft: panel.left, panelRight: panel.right, scroll: button.scrollWidth, client: button.clientWidth };
    }));
    for (const item of controls) {
      assert.ok(item.left >= item.panelLeft && item.right <= item.panelRight, JSON.stringify(item));
      assert.ok(item.scroll <= item.client + 1, JSON.stringify(item));
    }
    await t(page, "scope-all").click();
    assert.equal(await t(page, "queue-count").innerText(), "9");
  });
});

for (const scenario of ["", "save-failure"]) {
  test(`pending wide-to-narrow resize keeps ${scenario ? "failure and retry" : "confirmation"} visible and focused`, async () => {
    await withApp(1440, async page => {
      await t(page, "scope-all").click();
      await t(page, "search").fill("Mina");
      await checkKit(page);
      await t(page, "return-submit").click();
      assert.equal((await page.evaluate(() => window.equipmentStore())).pending, true);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() => document.body.dataset.view === "detail");
      assert.equal(await t(page, "detail").isVisible(), true);
      assert.equal(await t(page, "return-status").evaluate(el => el === document.activeElement), true);
      await page.clock.runFor(700);
      const focusId = scenario ? "return-submit" : "return-status";
      await page.waitForFunction(id => document.activeElement?.dataset.testid === id, focusId);
      assert.equal(await t(page, focusId).isVisible(), true);
      assert.match(await t(page, "return-status").innerText(), scenario ? /Could not save/ : /Return recorded/);
      const focusVisible = await t(page, focusId).evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
      });
      assert.equal(focusVisible, true);
      await page.goBack();
      await page.waitForFunction(() => document.body.dataset.view === "queue");
      assert.equal(await t(page, "search").inputValue(), "Mina");
      assert.equal(await t(page, "scope-all").getAttribute("aria-pressed"), "true");
      assert.equal((await page.evaluate(() => window.equipmentStore())).events.length, scenario ? 0 : 1);
    }, { scenario, clock: true });
  });
}

test("wide row keyboard activation preserves selected row focus and forward Tab order", async () => {
  await withApp(1440, async page => {
    await t(page, "loan-kit-13").focus();
    await page.keyboard.press("Enter");
    assert.equal(await t(page, "loan-kit-13").evaluate(el => el === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await t(page, "loan-kit-14").evaluate(el => el === document.activeElement), true);
  });
});

test("320px enlarged and spaced checklist groups descriptions into readable lines", async () => {
  await withApp(320, async page => {
    await t(page, "loan-kit-12").click();
    await page.addStyleTag({ content: "html {font-size:200% !important} * {line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p {margin-bottom:2em !important}" });
    const description = await t(page, "check-microphone").locator("..").locator("small").boundingBox();
    const row = await t(page, "check-microphone").locator("..").boundingBox();
    assert.ok(description.width > 80, `description width ${description.width}`);
    assert.ok(row.height < 180, `check row height ${row.height}`);
  });
});

test("320px enlarged and spaced loan metadata text stays inside the detail panel", async () => {
  await withApp(320, async page => {
    await t(page, "loan-kit-12").click();
    await page.addStyleTag({ content: "html {font-size:200% !important} * {line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p {margin-bottom:2em !important}" });
    const textGeometry = await page.locator(".loan-metadata dt, .loan-metadata dd").evaluateAll(items => items.map(item => {
      const range = document.createRange();
      range.selectNodeContents(item);
      const panel = item.closest(".detail-panel").getBoundingClientRect();
      return { text: item.textContent, rects: [...range.getClientRects()].map(rect => ({ left: rect.left, right: rect.right })), panelLeft: panel.left, panelRight: panel.right };
    }));
    for (const item of textGeometry) for (const rect of item.rects) {
      assert.ok(rect.left >= item.panelLeft && rect.right <= item.panelRight, JSON.stringify(item));
    }
  });
});

for (const width of [320, 390]) for (const scenario of ["", "long-content"]) {
  test(`${width}px enlarged ${scenario || "standard"} queue keeps identity full-width with metadata below`, async () => {
    await withApp(width, async page => {
      await page.addStyleTag({ content: "html {font-size:200% !important} * {line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important} p {margin-bottom:2em !important}" });
      const geometry = await t(page, "loan-kit-12").evaluate(button => {
        const identity = button.querySelector(".loan-identity").getBoundingClientRect();
        const row = button.closest("tr"), name = button.querySelector(".kit-name"), date = row.querySelector(".date-cell").getBoundingClientRect();
        const text = name.firstChild.textContent, start = text.indexOf("Field"), range = document.createRange();
        range.setStart(name.firstChild, start); range.setEnd(name.firstChild, start + 5);
        return { width: identity.width, bottom: identity.bottom, dateTop: date.top, wordLines: range.getClientRects().length };
      });
      assert.ok(geometry.width >= 195, JSON.stringify(geometry));
      assert.ok(geometry.dateTop >= geometry.bottom, JSON.stringify(geometry));
      assert.equal(geometry.wordLines, 1, JSON.stringify(geometry));
      // Identity width, an unbroken word, and metadata below detect the squeezed
      // layout without imposing a font-specific height on legitimate long content.
    }, { scenario });
  });
}

test("standard390px queue retains identity beside due and status", async () => {
  await withApp(390, async page => {
    const geometry = await t(page, "loan-kit-12").evaluate(button => {
      const identity = button.getBoundingClientRect(), date = button.closest("tr").querySelector(".date-cell").getBoundingClientRect();
      return { identityRight: identity.right, dateLeft: date.left, identityBottom: identity.bottom, dateTop: date.top };
    });
    assert.ok(geometry.dateLeft > geometry.identityRight);
    assert.ok(geometry.dateTop < geometry.identityBottom);
  });
});
