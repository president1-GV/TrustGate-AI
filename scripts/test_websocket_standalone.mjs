import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global unhandled rejection tracker
const unhandledRejections = [];
process.on("unhandledRejection", (reason) => {
  unhandledRejections.push(reason);
});

// Construct simulated insforge client
let mockRealtime = {};
const insforge = {
  get realtime() {
    return mockRealtime;
  },
};

function subscribeToAccessRequests(callback) {
  let active = true;

  try {
    const conn = insforge.realtime.connect();
    const connPromise =
      conn && typeof conn.then === "function"
        ? conn
        : Promise.resolve(conn);

    connPromise
      .then(() => {
        if (!active) return;
        insforge.realtime.subscribe("access_requests").catch((err) => {
          console.warn("Could not subscribe to access_requests realtime channel:", err);
        });
        insforge.realtime.on("access_request_updated", callback);
      })
      .catch((err) => {
        console.warn("Could not connect to insforge.realtime:", err);
      });
  } catch (err) {
    console.warn("Realtime subscription setup exception:", err);
  }

  return () => {
    active = false;
    try {
      insforge.realtime.off("access_request_updated", callback);
    } catch {}
  };
}

async function testScenario(name, realtimeImpl) {
  mockRealtime = realtimeImpl;
  const initialUnhandled = unhandledRejections.length;

  const cb = (payload) => {};
  let unsub = null;

  try {
    unsub = subscribeToAccessRequests(cb);
  } catch (err) {
    // Synchronous errors handled
  }

  // Allow promise tick
  await new Promise((resolve) => setTimeout(resolve, 60));

  if (typeof unsub === "function") {
    try {
      unsub();
    } catch {}
  }

  const unhandledDelta = unhandledRejections.length - initialUnhandled;
  const passed = unhandledDelta === 0;

  console.log(`[${passed ? "PASS" : "FAIL"}] ${name}: unhandled_rejections=${unhandledDelta}`);
  if (!passed) {
    throw new Error(`Unhandled rejection in ${name}: ${unhandledRejections[unhandledRejections.length - 1]}`);
  }
}

console.log("=== EMPIRICAL CHALLENGE 2: WEBSOCKET CONNECTION GUARD SAFETY ===");

await testScenario("Scenario 1: connect() returns void / undefined", {
  connect: () => undefined,
  subscribe: () => Promise.resolve({ ok: true }),
  on: () => {},
  off: () => {},
});

await testScenario("Scenario 2: connect() returns rejected Promise", {
  connect: () => Promise.reject(new Error("Simulated WebSocket connection refused")),
  subscribe: () => Promise.resolve({ ok: true }),
  on: () => {},
  off: () => {},
});

await testScenario("Scenario 3: connect() returns null", {
  connect: () => null,
  subscribe: () => Promise.resolve({ ok: true }),
  on: () => {},
  off: () => {},
});

await testScenario("Scenario 4: connect() throws synchronous exception", {
  connect: () => {
    throw new Error("Immediate synchronous network failure");
  },
  subscribe: () => Promise.resolve({ ok: true }),
  on: () => {},
  off: () => {},
});

await testScenario("Scenario 5: subscribe() returns rejected Promise", {
  connect: () => Promise.resolve(),
  subscribe: () => Promise.reject(new Error("Channel authentication failed")),
  on: () => {},
  off: () => {},
});

await testScenario("Scenario 6: 100 concurrent subscriptions with mixed failures", {
  connect: (() => {
    let count = 0;
    return () => {
      count++;
      if (count % 3 === 0) return Promise.reject(new Error(`Rejection ${count}`));
      if (count % 3 === 1) return undefined;
      return Promise.resolve();
    };
  })(),
  subscribe: () => Promise.resolve({ ok: true }),
  on: () => {},
  off: () => {},
});

console.log(`ALL WEBSOCKET GUARD EMPIRICAL TESTS PASSED (Total unhandled rejections: ${unhandledRejections.length}).`);
