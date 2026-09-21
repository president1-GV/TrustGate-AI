const { spawn } = require("child_process");

const nodePath = process.execPath;
// Use the globally installed @insforge/cli directly
const cliPath = "C:/Users/VarunHarvard 1/AppData/Roaming/npm/node_modules/@insforge/cli/bin/run.js";

const proc = spawn(nodePath, [cliPath, "mcp"], {
  env: {
    ...process.env,
    API_KEY: "ik_4162301826fa9e54e295bb36793528ef",
    API_BASE_URL: "https://heicn84u.us-east.insforge.app",
    INSFORGE_API_KEY: "ik_4162301826fa9e54e295bb36793528ef",
    INSFORGE_URL: "https://heicn84u.us-east.insforge.app"
  },
  stdio: ["pipe", "pipe", "pipe"]
});

let output = "";
let errOut = "";

proc.stdout.on("data", d => {
  output += d.toString();
  process.stderr.write("[STDOUT DATA] " + d.toString() + "\n");
});
proc.stderr.on("data", d => {
  errOut += d.toString();
  process.stderr.write("[STDERR DATA] " + d.toString() + "\n");
});

proc.on("close", (code) => {
  process.stderr.write("Process exited with code: " + code + "\n");
});

proc.on("error", (err) => {
  process.stderr.write("Spawn error: " + err.message + "\n");
});

// Send initialize after 2s to let the server start
setTimeout(() => {
  const init = JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } }
  }) + "\n";
  process.stderr.write("Sending initialize...\n");
  proc.stdin.write(init);
}, 2000);

setTimeout(() => {
  const notif = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n";
  const list = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n";
  process.stderr.write("Sending initialized + tools/list...\n");
  proc.stdin.write(notif);
  proc.stdin.write(list);
}, 4000);

setTimeout(() => {
  const call = JSON.stringify({
    jsonrpc: "2.0", id: 3, method: "tools/call",
    params: { name: "fetch-docs", arguments: {} }
  }) + "\n";
  process.stderr.write("Sending fetch-docs call...\n");
  proc.stdin.write(call);
}, 7000);

setTimeout(() => {
  console.log("=== FINAL STDOUT ===");
  console.log(output || "(empty)");
  console.log("=== FINAL STDERR ===");
  console.log(errOut || "(empty)");
  proc.kill();
  process.exit(0);
}, 30000);
