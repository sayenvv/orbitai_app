#!/usr/bin/env node
/**
 * Prints usable LAN URLs, then starts `next dev`.
 * Avoid `--hostname 0.0.0.0` — Next.js displays that literally instead of your Wi‑Fi IP.
 */
import { spawn } from "node:child_process";
import os from "node:os";

const port = process.argv[2] ?? "3001";

function detectLocalIps() {
  const ips = [];
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === "IPv4" && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

const ips = detectLocalIps();

console.log("");
console.log(`  \x1b[1mOn this Mac:\x1b[0m         http://localhost:${port}`);
if (ips.length > 0) {
  for (const ip of ips) {
    console.log(`  \x1b[1mOn phone / tablet:\x1b[0m  http://${ip}:${port}`);
  }
  console.log("");
  console.log("  \x1b[2mIf the phone cannot connect:\x1b[0m");
  console.log("  \x1b[2m• Same Wi‑Fi (not mobile data or guest network)\x1b[0m");
  console.log("  \x1b[2m• macOS Firewall: allow incoming connections for Node\x1b[0m");
  console.log("  \x1b[2m• Keep uvicorn running on port 8000 (API is proxied via /api)\x1b[0m");
  console.log("  \x1b[2m• When you load the page on phone, a GET line should appear below\x1b[0m");
} else {
  console.log("  \x1b[33mNo LAN IP found — connect to Wi‑Fi, then restart.\x1b[0m");
}
console.log("");

const child = spawn("next", ["dev", "--port", port], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
