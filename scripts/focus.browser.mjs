import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";
import { tabFocusSample, hasVisibleFocus } from "./focus.mjs";
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
      `<style>${css}</style><div class="scope-controls"><button data-testid="scope-overdue" aria-pressed="true">Overdue</button></div><section class="detail-panel"><button class="back-button" data-testid="back-to-queue">Back to queue</button></section>`,
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
