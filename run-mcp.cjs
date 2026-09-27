const { spawn } = require("child_process");

const proc = spawn("npx", ["-y", "@insforge/mcp@latest"], {
  env: {
    ...process.env,
    API_KEY: process.env.INSFORGE_API_KEY || "",
    API_BASE_URL: process.env.INSFORGE_URL || "",
    INSFORGE_API_KEY: process.env.INSFORGE_API_KEY || "",
    INSFORGE_URL: process.env.INSFORGE_URL || ""
  },
  stdio: ["pipe", "pipe", "pipe"],
  shell: true
});

let output = "";
let errOut = "";

proc.stdout.on("data", d => {
  output += d.toString();
  process.stderr.write("[STDOUT] " + d.toString());
});
proc.stderr.on("data", d => {
  errOut += d.toString();
  process.stderr.write("[STDERR] " + d.toString());
});

proc.on("close", (code) => {
  process.stderr.write("Process exited: " + code + "\n");
});

proc.on("error", (err) => {
  process.stderr.write("Spawn error: " + err.message + "\n");
});

// Step 1: initialize
setTimeout(() => {
  const init = JSON.stringify({
    jsonrpc: "2.0", id: 1, method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "kiro-client", version: "1.0" }
    }
  }) + "\n";
  process.stderr.write("Sending initialize...\n");
  proc.stdin.write(init);
}, 3000);

// Step 2: initialized + tools/list
setTimeout(() => {
  const notif = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n";
  const list = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n";
  process.stderr.write("Sending initialized notification + tools/list...\n");
  proc.stdin.write(notif);
  proc.stdin.write(list);
}, 6000);

// Step 3: call fetch-docs
setTimeout(() => {
  const call = JSON.stringify({
    jsonrpc: "2.0", id: 3, method: "tools/call",
    params: { name: "fetch-docs", arguments: {} }
  }) + "\n";
  process.stderr.write("Sending fetch-docs call...\n");
  proc.stdin.write(call);
}, 10000);

// Step 4: print and exit
setTimeout(() => {
  console.log("=== STDOUT ===");
  console.log(output || "(empty)");
  console.log("=== STDERR ===");
  console.log(errOut || "(empty)");
  proc.kill();
  process.exit(0);
}, 30000);
