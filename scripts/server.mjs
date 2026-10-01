import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { safeFile, sha } from "./evidence.mjs";
export async function startServer(
  root,
  identity,
  { serverFactory = http.createServer } = {},
) {
  // Read once. The server serves these exact frozen bytes, not later disk edits.
  const files = new Map();
  for (const item of [
    ...identity.source.filter((x) => x.path.startsWith("examples/equipment/")),
    { path: "examples/equipment/fixtures.json", sha256: identity.fixture_hash },
  ]) {
    const bytes = fs.readFileSync(safeFile(root, item.path));
    if (sha(bytes) !== item.sha256)
      throw new Error("source changed while freezing server");
    files.set("/" + item.path, bytes);
  }
  const served = [];
  const server = serverFactory((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(req.url, "http://127.0.0.1").pathname,
      );
    } catch {
      res.writeHead(400).end();
      return;
    }
    const bytes = files.get(pathname);
    if (!bytes) {
      res.writeHead(404).end("Not found");
      return;
    }
    const mime =
      {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript",
        ".json": "application/json",
        ".svg": "image/svg+xml",
      }[path.extname(pathname)] || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-UI-Build", identity.source_hash);
    served.push({
      path: pathname,
      sha256: sha(bytes),
      build: identity.source_hash,
    });
    res.end(bytes);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    served,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

// Human preview uses the same frozen-byte loopback server; no external hosts.
if (
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))
) {
  const { identity } = await import("./evidence.mjs");
  const preview = await startServer(process.cwd(), identity(process.cwd()));
  console.log(
    `Equipment preview: ${preview.url}/examples/equipment/index.html`,
  );
  console.log("Frozen bytes: restart after edits. Ctrl-C to stop.");
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, async () => {
      await preview.close();
      process.exit(0);
    });
}
