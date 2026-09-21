const { spawn } = require("child_process");

const proc = spawn("cmd", ["/c", "npx -y @insforge/cli mcp"], {
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

proc.stdout.on("data", d => { output += d.toString(); });
proc.stderr.on("data", d => { errOut += d.toString(); });

proc.on("close", (code) => {
  console.log("Process exited with code:", code);
});

// Send initialize
const init = JSON.stringify({
  jsonrpc: "2.0", id: 1, method: "initialize",
  params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1.0" } }
}) + "\n";
proc.stdin.write(init);

setTimeout(() => {
  // Send initialized notification
  const notif = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n";
  proc.stdin.write(notif);
  // Also list tools
  const list = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }) + "\n";
  proc.stdin.write(list);
}, 2000);

setTimeout(() => {
  // Call fetch-docs
  const call = JSON.stringify({
    jsonrpc: "2.0", id: 3, method: "tools/call",
    params: { name: "fetch-docs", arguments: {} }
  }) + "\n";
  proc.stdin.write(call);
}, 4000);

setTimeout(() => {
  console.log("=== STDOUT ===");
  console.log(output);
  console.log("=== STDERR ===");
  console.log(errOut);
  proc.kill();
  process.exit(0);
}, 25000);
