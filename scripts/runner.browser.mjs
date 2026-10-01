import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { chromium } from "playwright";
import { identity } from "./evidence.mjs";
import { startServer } from "./server.mjs";
import { restrictToOrigin, submitWhilePending, clippedInteractiveContent } from "./runner-browser.mjs";

test("duplicate browser regression detects deletion of the actual pending guard", async () => {
  const server = await startServer(process.cwd(), identity(process.cwd()));
  const browser = await chromium.launch();
  try {
    for (const mutant of [false, true]) {
      const page = await browser.newPage();
      if (mutant) {
        const app = fs.readFileSync("examples/equipment/app.js", "utf8");
        const original = 'async function saveReturn(event) {';
        const head = app.indexOf(original), guard = app.indexOf('store.pending ||', head);
        assert.ok(guard > head, "mutation must target saveReturn pending guard");
        const changed = app.slice(0, guard) + app.slice(guard).replace('store.pending ||', '');
        await page.route("**/app.js", route => route.fulfill({ contentType: "text/javascript", body: changed }));
      }
      await page.goto(server.url + "/examples/equipment/index.html");
      await page.getByTestId("loan-kit-12").click();
      for (const id of ["recorder", "microphone", "cables"]) await page.getByTestId(`check-${id}`).check();
      const attempts = await submitWhilePending(page);
      assert.deepEqual(attempts, { submissions: 3, pending: true, events: 0 });
      await page.clock.runFor(700);
      const count = await page.evaluate(() => window.equipmentStore().events.length);
      assert.equal(count, mutant ? 3 : 1, "same repeated-submit assertion must reject deleted pending guard");
      await page.close();
    }
  } finally { await browser.close(); await server.close(); }
});

test("external requests are aborted and recorded including successful-looking resources", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(), network = [];
    await restrictToOrigin(page, "http://127.0.0.1:1234", network);
    await page.setContent('<img src="https://example.invalid/external.png">');
    await page.waitForFunction(() => document.querySelector("img").complete);
    assert.equal(network.length, 1);
    assert.equal(network[0].forbidden_external, true);
    assert.equal(await page.locator("img").evaluate(img => img.naturalWidth), 0);
  } finally { await browser.close(); }
});

test("interactive child clipping is caught even without document overflow", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
    await page.setContent('<style>button {width:80px;height:30px;overflow:hidden;font-size:32px;white-space:nowrap}</style><button data-testid="clipped">Return equipment</button>');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal((await clippedInteractiveContent(page))[0].id, "clipped");
    await page.addStyleTag({ content: 'button {width:auto;height:auto;white-space:normal}' });
    assert.deepEqual(await clippedInteractiveContent(page), []);
  } finally { await browser.close(); }
});


test("off-origin WebSocket is recorded and never reaches the upgrade server", async () => {
  const server = http.createServer((_req, res) => res.end("<p>Socket fixture</p>"));
  const primary = http.createServer((_req, res) => res.end("<p>Primary fixture</p>"));
  await new Promise(resolve => primary.listen(0, "127.0.0.1", resolve));
  let upgrades = 0;
  server.on("upgrade", (_request, socket) => { upgrades++; socket.destroy(); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(), network = [];
    await restrictToOrigin(page, `http://127.0.0.1:${primary.address().port}`, network);
    await page.goto(`http://127.0.0.1:${primary.address().port}`);
    const url = `ws://127.0.0.1:${server.address().port}/external`;
    const outcome = await page.evaluate(url => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("socket not closed")), 3000);
      const socket = new WebSocket(url);
      socket.onclose = event => { clearTimeout(timeout); resolve({code:event.code}); };
    }), url);
    assert.ok([1006, 1008].includes(outcome.code), "blocked connection must close abnormally or by policy");
    assert.equal(upgrades, 0, "prohibited WebSocket must not attempt a handshake");
    assert.equal(network.length, 1);
    assert.equal(network[0].url, url);
    assert.equal(network[0].forbidden_external, true);
    const allowedPage = await browser.newPage(), allowedNetwork = [];
    await restrictToOrigin(allowedPage, `http://127.0.0.1:${server.address().port}`, allowedNetwork);
    await allowedPage.goto(`http://127.0.0.1:${server.address().port}`);
    await allowedPage.evaluate(url => new Promise(resolve => {
      const socket = new WebSocket(url);
      socket.onclose = () => resolve();
    }), url);
    assert.equal(upgrades, 1, "ws scheme must map to the matching http origin");
    assert.deepEqual(allowedNetwork, []);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await new Promise(resolve => primary.close(resolve)); }
});
