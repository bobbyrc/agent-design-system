import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

test("preview CLI runs through a percent-encoded spaced path and symlink", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ui preview "));
  const script = path.join(temp, "server link.mjs");
  fs.symlinkSync(fileURLToPath(new URL("./server.mjs", import.meta.url)), script);
  const child = spawn(process.execPath, [script], { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] });
  let output = "", errors = "";
  child.stdout.on("data", chunk => output += chunk);
  child.stderr.on("data", chunk => errors += chunk);
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`preview did not start: ${errors}`)), 5000);
      child.stdout.on("data", () => { if (output.includes("Equipment preview:")) { clearTimeout(timeout); resolve(); } });
      child.once("exit", code => { clearTimeout(timeout); reject(new Error(`preview exited ${code}: ${errors}`)); });
    });
    assert.match(output, /Equipment preview: http:\/\/127\.0\.0\.1:\d+\/examples\/equipment\/index\.html/);
  } finally {
    child.kill("SIGTERM");
    await new Promise(resolve => child.once("close", resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
