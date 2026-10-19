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
      ilike: () => chain,
      like: () => chain,
      or: () => chain,
      in: () => chain,
      is: () => chain,
      contains: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: inMemoryData[0] || null, error: null }),
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

// ── HTMLCanvasElement & ResizeObserver mocks for Node/JSDOM ─────────────────
if (typeof HTMLCanvasElement !== "undefined") {
  const parseColor = (color: string) => {
    if (typeof color === "string" && color.startsWith("#") && color.length === 7) {
      const num = parseInt(color.slice(1), 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    return [128, 128, 128];
  };

  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ..._args: any[]) {
    const canvas = this as any;
    if (!canvas._pixelBuffer) {
      const w = canvas.width || 320;
      const h = canvas.height || 240;
      canvas._pixelBuffer = new Uint8ClampedArray(w * h * 4).fill(128);
    }
    return {
      canvas,
      createImageData: vi.fn().mockImplementation((w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      })),
      _fillStyle: "#000000",
      get fillStyle() {
        return this._fillStyle;
      },
      set fillStyle(val: string) {
        this._fillStyle = val;
      },
      fillRect: vi.fn().mockImplementation(function (this: any, _x: number, _y: number, _w: number, _h: number) {
        const [r, g, b] = parseColor(this.fillStyle);
        const buf = canvas._pixelBuffer;
        for (let i = 0; i < buf.length; i += 4) {
          buf[i] = r;
          buf[i + 1] = g;
          buf[i + 2] = b;
          buf[i + 3] = 255;
        }
      }),
      clearRect: vi.fn(),
      drawImage: vi.fn().mockImplementation((src: any) => {
        if (src) {
          const srcBuf = src._pixelBuffer || src.getContext?.("2d")?.canvas?._pixelBuffer || src.data;
          if (srcBuf && canvas._pixelBuffer) {
            const len = Math.min(canvas._pixelBuffer.length, srcBuf.length);
            for (let i = 0; i < len; i++) {
              canvas._pixelBuffer[i] = srcBuf[i];
            }
          }
        }
      }),
      getImageData: vi.fn().mockImplementation((_sx: number, _sy: number, sw: number, sh: number) => {
        const w = sw || canvas.width || 320;
        const h = sh || canvas.height || 240;
        return {
          data: canvas._pixelBuffer || new Uint8ClampedArray(w * h * 4).fill(128),
          width: w,
          height: h,
        };
      }),
      putImageData: vi.fn().mockImplementation((imgData: ImageData) => {
        if (canvas._pixelBuffer && imgData?.data) {
          const len = Math.min(canvas._pixelBuffer.length, imgData.data.length);
          for (let i = 0; i < len; i++) {
            canvas._pixelBuffer[i] = imgData.data[i];
          }
        }
      }),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      filter: "",
    } as any;
  };

  HTMLCanvasElement.prototype.toBlob = function (this: HTMLCanvasElement, cb: (b: Blob | null) => void, mime = "image/png") {
    const buf = (this as any)._pixelBuffer || new Uint8ClampedArray((this.width || 320) * (this.height || 240) * 4).fill(128);
    if (typeof cb === "function") {
      setTimeout(() => cb(new Blob([buf], { type: mime })), 0);
    }
  };

  HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement, mime = "image/png") {
    return `data:${mime};base64,mockBase64_${this.width}x${this.height}`;
  };
}

if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function (this: Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(this);
    });
  };
}

if (typeof window !== "undefined") {
  class MockImage {
    onload: (() => void) | null = null;
    onerror: ((err?: any) => void) | null = null;
    width = 320;
    height = 240;
    naturalWidth = 320;
    naturalHeight = 240;
    crossOrigin = "";
    private _src = "";
    get src() {
      return this._src;
    }
    set src(value: string) {
      this._src = value;
      setTimeout(() => {
        if (!value || value.trim() === "" || value.includes("invalid") || value.includes("error")) {
          this.onerror?.(new Error("Failed to load image"));
        } else {
          this.onload?.();
        }
      }, 0);
    }
  }
  window.Image = MockImage as any;
  (globalThis as any).Image = MockImage;
}

if (typeof window !== "undefined") {
  const createStorageMock = () => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length;
      },
    };
  };

  try {
    if (!window.localStorage || typeof window.localStorage.clear !== "function") {
      const mock = createStorageMock();
      Object.defineProperty(window, "localStorage", { value: mock, writable: true, configurable: true });
      Object.defineProperty(globalThis, "localStorage", { value: mock, writable: true, configurable: true });
    }
  } catch {
    const mock = createStorageMock();
    (globalThis as any).localStorage = mock;
  }

  try {
    if (!window.sessionStorage || typeof window.sessionStorage.clear !== "function") {
      const mock = createStorageMock();
      Object.defineProperty(window, "sessionStorage", { value: mock, writable: true, configurable: true });
      Object.defineProperty(globalThis, "sessionStorage", { value: mock, writable: true, configurable: true });
    }
  } catch {
    const mock = createStorageMock();
    (globalThis as any).sessionStorage = mock;
  }
}

// ── In-Memory IndexedDB Mock for Vitest ───────────────────────────────────────
if (typeof window !== "undefined" && typeof (window as any).indexedDB === "undefined") {
  const stores = new Map<string, Map<string, any>>();

  const createObjectStoreMock = (storeName: string) => {
    if (!stores.has(storeName)) {
      stores.set(storeName, new Map());
    }
    const map = stores.get(storeName)!;

    return {
      count: () => {
        const req: any = { result: map.size, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      getAll: () => {
        const req: any = { result: Array.from(map.values()), onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      get: (key: string) => {
        const req: any = { result: map.get(key) || null, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      add: (val: any) => {
        const key = val.id || val.case_code || `id-${Date.now()}-${Math.random()}`;
        map.set(key, val);
        const req: any = { result: key, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      put: (val: any) => {
        const key = val.id || val.case_code || `id-${Date.now()}-${Math.random()}`;
        map.set(key, val);
        const req: any = { result: key, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      delete: (key: string) => {
        map.delete(key);
        const req: any = { result: undefined, onsuccess: null, onerror: null };
        setTimeout(() => req.onsuccess?.({ target: req }), 0);
        return req;
      },
      createIndex: () => ({}),
    };
  };

  const mockDb = {
    objectStoreNames: {
      contains: () => false,
    },
    createObjectStore: (name: string) => createObjectStoreMock(name),
    transaction: (_storeNames: string | string[], _mode: string) => {
      const tx: any = {
        objectStore: (name: string) => createObjectStoreMock(name),
        oncomplete: null,
        onerror: null,
        error: null,
      };
      setTimeout(() => tx.oncomplete?.(), 5);
      return tx;
    },
  };

  const mockIndexedDB = {
    open: (_name: string, _version?: number) => {
      const req: any = {
        result: mockDb,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };
      setTimeout(() => {
        req.onupgradeneeded?.({ target: req });
        req.onsuccess?.({ target: req });
      }, 0);
      return req;
    },
  };

  Object.defineProperty(window, "indexedDB", { value: mockIndexedDB, writable: true, configurable: true });
  Object.defineProperty(globalThis, "indexedDB", { value: mockIndexedDB, writable: true, configurable: true });
}




