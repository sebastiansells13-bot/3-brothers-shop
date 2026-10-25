#!/usr/bin/env node
// Dev entrypoint: clean old output, run Sass + Eleventy watch tasks
// concurrently with hot reload, and clean up again on exit (Ctrl+C).
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

function clean() {
  rmSync("dev", { recursive: true, force: true });
  rmSync("docs", { recursive: true, force: true });
}

clean();

// `shell: true` is required on Windows to resolve `npm` (a .cmd shim)
// correctly; it's harmless on macOS/Linux. The full command is passed as a
// single string (rather than a separate args array) to avoid Node's
// shell-argument-escaping warning.
const children = ["watch:sass", "watch:eleventy"].map((script) =>
  spawn(`npm run ${script}`, { stdio: "inherit", shell: true })
);

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  clean();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of children) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`A watch process exited unexpectedly (code ${code}).`);
      shutdown();
    }
  });
}
