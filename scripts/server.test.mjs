import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { EventEmitter } from "node:events";
import { startServer } from "./server.mjs";
import { sha } from "./evidence.mjs";
function sources(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "ui-server-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "examples/equipment"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "examples/equipment/index.html"),
    "original frozen HTML",
  );
  fs.writeFileSync(path.join(root, "examples/equipment/fixtures.json"), "{}");
  return {
    root,
    identity: {
      source: [
        {
          path: "examples/equipment/index.html",
          sha256: sha("original frozen HTML"),
        },
      ],
      source_hash: sha("source"),
      fixture_hash: sha("{}"),
      contract_hash: sha("contract"),
    },
  };
}
test("loopback bind error rejects and can be recorded by runner catch/finally", async (t) => {
  const f = sources(t);
  const fake = new EventEmitter();
  fake.listen = () =>
    queueMicrotask(() =>
      fake.emit(
        "error",
        Object.assign(new Error("bind EPERM"), { code: "EPERM" }),
      ),
    );
  await assert.rejects(
    startServer(f.root, f.identity, { serverFactory: () => fake }),
    /bind EPERM/,
  );
});
test("server binds only loopback and serves original byte snapshot after disk edit", async (t) => {
  const f = sources(t);
  let handler;
  const fake = new EventEmitter();
  fake.listen = (port, host, done) => {
    assert.equal(port, 0);
    assert.equal(host, "127.0.0.1");
    queueMicrotask(done);
  };
  fake.address = () => ({ port: 1234 });
  fake.close = (done) => done();
  const server = await startServer(f.root, f.identity, {
    serverFactory: (fn) => {
      handler = fn;
      return fake;
    },
  });
  fs.writeFileSync(
    path.join(f.root, "examples/equipment/index.html"),
    "later disk mutation",
  );
  let bytes;
  const headers = {};
  handler(
    { url: "/examples/equipment/index.html" },
    { setHeader: (k, v) => (headers[k] = v), end: (b) => (bytes = b) },
  );
  assert.equal(bytes.toString(), "original frozen HTML");
  assert.equal(headers["X-UI-Build"], f.identity.source_hash);
  assert.equal(server.served[0].sha256, sha(bytes));
  await server.close();
});
test("changed bytes before server freeze rejected", async (t) => {
  const f = sources(t);
  fs.writeFileSync(
    path.join(f.root, "examples/equipment/index.html"),
    "changed",
  );
  await assert.rejects(
    startServer(f.root, f.identity),
    /changed while freezing/,
  );
});
