import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { tabFocusSample, hasVisibleFocus, snapshotFocusStyles, currentFocusSample } from "./focus.mjs";
const css = fs.readFileSync(
  new URL("../examples/equipment/styles.css", import.meta.url),
  "utf8",
);
test("actual equipment CSS focus removal fails even with decorative scope/panel shadows", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    await page.setContent(
      `<style>${css} body {padding:10px}</style><div class="scope-controls"><button data-testid="scope-overdue" aria-pressed="true">Overdue</button></div><section class="detail-panel"><button class="back-button" data-testid="back-to-queue">Back to queue</button></section>`,
    );
    await page.evaluate(() => {
      document.body.dataset.view = "detail";
    });
    const focused = await tabFocusSample(page);
    assert.equal(focused.id, "scope-overdue");
    assert.equal(hasVisibleFocus(focused), true);
    await page.evaluate(() => {
      function removeFocusRules(sheet) {
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
          const rule = sheet.cssRules[i];
          if (rule.cssRules) {
            removeFocusRules(rule);
          } else if (rule.selectorText?.includes(":focus")) sheet.deleteRule(i);
        }
      }
      for (const sheet of document.styleSheets) removeFocusRules(sheet);
    });
    await page.addStyleTag({
      content: "*:focus, *:focus-visible {outline:none !important}",
    });
    const unstyledBack = await tabFocusSample(page);
    assert.equal(unstyledBack.id, "back-to-queue");
    assert.equal(
      hasVisibleFocus(unstyledBack),
      false,
      "panel decoration must not stand in for missing focus rule",
    );
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    const unstyledScope = await tabFocusSample(page);
    assert.equal(unstyledScope.id, "scope-overdue");
    assert.equal(
      hasVisibleFocus(unstyledScope),
      false,
      "selected-scope decoration must not stand in for missing focus rule",
    );
  } finally {
    await browser.close();
  }
});

test("unrevealed skip link and hiding/clipping ancestors cannot pass focus", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>${css}</style><a class="skip-link" href="#target">Skip to loans</a><main id="target"></main>`);
    assert.equal(hasVisibleFocus(await tabFocusSample(page)), true);
    await page.setContent(`<style>${css}\n.skip-link:focus {clip-path:inset(50%) !important}</style><a class="skip-link" href="#target">Skip to loans</a><main id="target"></main>`);
    assert.equal(hasVisibleFocus(await tabFocusSample(page)), false);
    for (const style of ["opacity:0", "visibility:hidden", "clip-path:inset(50%)", "position:absolute;clip:rect(0,0,0,0)", "height:1px;overflow:hidden"]) {
      await page.setContent(`<style>button:focus{outline:3px solid blue}</style><div style="${style}"><div><div><div><button>Hidden focus</button></div></div></div></div>`);
      assert.equal(hasVisibleFocus(await tabFocusSample(page)), false, style);
    }
  } finally { await browser.close(); }
});


test("restored focus requires a visible changed indicator after real keyboard modality", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: {width:390, height:844} });
    await page.setContent(`<style>${css}</style><button data-testid="target">Loan</button>`);
    await snapshotFocusStyles(page);
    await page.keyboard.press("Escape");
    // Recreating a queue row must preserve its unfocused comparison identity.
    await page.locator("button").evaluate(button => button.replaceWith(button.cloneNode(true)));
    await page.getByTestId("target").focus();
    const good = await currentFocusSample(page);
    assert.equal(good.id, "target");
    assert.equal(hasVisibleFocus(good), true);
    for (const mutant of [
      "*:focus-visible {outline:none !important;box-shadow:none !important}",
      "button {position:fixed;left:-1000px !important}",
      "button {opacity:0 !important}",
    ]) {
      const style = await page.addStyleTag({ content:mutant });
      assert.equal(hasVisibleFocus(await currentFocusSample(page)), false, mutant);
      await style.evaluate(element => element.remove());
    }
  } finally { await browser.close(); }
});
