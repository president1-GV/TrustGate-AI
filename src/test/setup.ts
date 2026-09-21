import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Auto-clean DOM after every test
afterEach(() => {
  cleanup();
});

// ── InsForge SDK mock ────────────────────────────────────────────────────────
// ── InsForge SDK mock ────────────────────────────────────────────────────────
vi.mock("@insforge/sdk", () => {
  let inMemoryData: any[] = [];

  const buildChain = (overrides: Record<string, unknown> = {}) => {
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (rows: any) => {
        const arr = Array.isArray(rows) ? rows : [rows];
        const inserted = arr.map((r, i) => ({
          id: r.id || `mock-id-${Date.now()}-${i}`,
          ...r,
        }));
        inMemoryData = [...inMemoryData, ...inserted];
        return buildChain({
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: inserted, error: null }).then(resolve),
        });
      },
      update: (fields: any) => {
        const updated = (inMemoryData.length > 0 ? inMemoryData : [{ id: "mock-id-1" }]).map((r) => ({
          ...r,
          ...fields,
        }));
        inMemoryData = updated;
        return buildChain({
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: updated, error: null }).then(resolve),
        });
      },
      delete: () => chain,
      eq: (col: string, val: any) => {
        const filtered = inMemoryData.filter((r) => r[col] === val);
        return buildChain({
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: filtered, error: null }).then(resolve),
        });
      },
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve({ data: inMemoryData[0] || null, error: null }),
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: inMemoryData, error: null }).then(resolve),
      ...overrides,
    };
    return chain;
  };

  const authMock = {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
    updateUser: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  };

  const realtimeMock = {
    connect: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    publish: vi.fn(() => Promise.resolve()),
  };

  const clientMock = {
    auth: authMock,
    realtime: realtimeMock,
    from: vi.fn(() => buildChain()),
    database: { from: vi.fn(() => buildChain()) },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: {}, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      })),
    },
    rpc: vi.fn(() => Promise.resolve({ data: "officer", error: null })),
  };

  return {
    createClient: vi.fn(() => clientMock),
  };
});

// ── React Router mock ────────────────────────────────────────────────────────
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/", state: null, search: "", hash: "" }),
    useParams: () => ({}),
  };
});
