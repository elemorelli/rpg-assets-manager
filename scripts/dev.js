import { spawn } from "node:child_process";

const children = [
  spawn("node", ["--watch", "src/server/index.ts"], {
    stdio: "inherit",
    env: { ...process.env, PORT: "3001" },
  }),
  spawn("npx", ["vite"], { stdio: "inherit" }),
];

const shutdown = () => {
  for (const child of children) {
    child.kill();
  }
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const child of children) {
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      shutdown();
    }
  });
}
