import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const forwarded = [];
for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--strictPort") continue;
  if (args[index] === "--host") {
    forwarded.push("--hostname", args[index + 1]);
    index += 1;
    continue;
  }
  forwarded.push(args[index]);
}
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", ...forwarded], { stdio: "inherit" });
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}
const { code, signal } = await new Promise((resolve) => child.on("exit", (exitCode, exitSignal) => resolve({ code: exitCode, signal: exitSignal })));
if (signal) process.kill(process.pid, signal);
process.exit(code ?? 0);
