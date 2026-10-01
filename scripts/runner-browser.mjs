// Shared actual-browser checks used by both the adapter and its mutation tests.
export async function restrictToOrigin(page, allowedOrigin, network) {
  await page.routeWebSocket(() => true, async (socket) => {
    const url = socket.url();
    const origin = new URL(url);
    // WebSocket origins correspond to HTTP origins on the same host and port.
    origin.protocol = origin.protocol === "wss:" ? "https:" : "http:";
    if (origin.origin !== allowedOrigin) {
      network.push({ url, first_party: false, forbidden_external: true,
        failure: "External WebSocket origin prohibited by local-only verification policy" });
      // A routed socket never reaches the server unless connectToServer is called.
      await socket.close({ code: 1008, reason: "External origin prohibited" });
    } else socket.connectToServer();
  });
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (new URL(url).origin !== allowedOrigin) {
      network.push({ url, first_party: false, forbidden_external: true,
        failure: "External origin prohibited by local-only verification policy" });
      await route.abort("blockedbyclient");
    } else await route.continue();
  });
}
export async function submitWhilePending(page) {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  return page.evaluate(() => {
    const form = document.querySelector(".return-form");
    let submissions = 0;
    form.addEventListener("submit", () => submissions++);
    // requestSubmit() with no submitter dispatches the submit event even though
    // the application disables its submit button and fieldset after attempt 1.
    form.requestSubmit();
    form.requestSubmit();
    form.requestSubmit();
    return { submissions, pending: window.equipmentStore().pending,
      events: window.equipmentStore().events.length };
  });
}
export async function clippedInteractiveContent(page) {
  return page.evaluate(() => {
    const failures = [];
    const contains = (outer, inner) => inner.left >= outer.left - 1 &&
      inner.right <= outer.right + 1 && inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1;
    for (const element of document.querySelectorAll("button, a[href], input, select, textarea")) {
      if (!element.getClientRects().length || getComputedStyle(element).visibility !== "visible") continue;
      const id = element.dataset.testid || element.id || element.tagName;
      const regions = [element.getBoundingClientRect()];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent.trim() || node.parentElement.closest('[aria-hidden="true"], .sr-only')) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        regions.push(...range.getClientRects());
      }
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const css = getComputedStyle(ancestor), rect = ancestor.getBoundingClientRect();
        if (css.clipPath !== "none" || css.clip !== "auto" || Number(css.opacity) === 0) {
          // An intentionally hidden skip link is checked on focus by KEYBOARD-01.
          if (!element.matches('.skip-link:not(:focus)')) failures.push({ id, reason: "hidden/clipped ancestor" });
          break;
        }
        const clippingX = ["hidden", "clip", "scroll", "auto"].includes(css.overflowX);
        const clippingY = ["hidden", "clip", "scroll", "auto"].includes(css.overflowY);
        if (!clippingX && !clippingY) continue;
        const clip = { left: clippingX ? rect.left + ancestor.clientLeft : -Infinity,
          right: clippingX ? rect.left + ancestor.clientLeft + ancestor.clientWidth : Infinity,
          top: clippingY ? rect.top + ancestor.clientTop : -Infinity,
          bottom: clippingY ? rect.top + ancestor.clientTop + ancestor.clientHeight : Infinity };
        if ((ancestor === element ? regions.slice(1) : regions).some(region => !contains(clip, region))) {
          failures.push({ id, reason: "interactive content extends outside clipping ancestor", ancestor: ancestor.tagName }); break;
        }
      }
    }
    return failures;
  });
}
