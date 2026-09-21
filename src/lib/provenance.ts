/**
 * TRUSTGATE AI — Cryptographic Document Provenance & Integrity Engine
 * 
 * Computes deterministic SHA-256 digests on raw image buffers
 * and binds each screening run to an immutable provenance record.
 */

import type { DocumentProvenance } from "@/ai/types";

/**
 * Computes a SHA-256 hexadecimal digest for any ArrayBuffer, Uint8Array, Blob, or File.
 * Uses Web Crypto API (SubtleCrypto) with a reliable pure-JS fallback for testing environments.
 */
export async function computeSha256(data: ArrayBuffer | Uint8Array | Blob | File): Promise<string> {
  let buffer: ArrayBuffer;
  if (typeof (data as any)?.arrayBuffer === "function") {
    buffer = await (data as any).arrayBuffer();
  } else if (typeof Blob !== "undefined" && data instanceof Blob && typeof FileReader !== "undefined") {
    buffer = await new Promise<ArrayBuffer>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as ArrayBuffer);
      fr.onerror = () => rej(new Error("Failed to read Blob as ArrayBuffer"));
      fr.readAsArrayBuffer(data);
    });
  } else if (data instanceof Uint8Array) {
    buffer = (data.buffer as ArrayBuffer).slice(data.byteOffset, data.byteOffset + data.byteLength);
  } else {
    buffer = data as ArrayBuffer;
  }

  if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
    try {
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // Fall through to software digest
    }
  }

  // Pure software SHA-256 fallback (RFC 6234 compliant)
  return softwareSha256(new Uint8Array(buffer));
}

/**
 * Pure TypeScript SHA-256 implementation for air-gapped or headless test runners.
 */
function softwareSha256(bytes: Uint8Array): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  let H0 = 0x6a09e667, H1 = 0xbb67ae85, H2 = 0x3c6ef372, H3 = 0xa54ff53a;
  let H4 = 0x510e527f, H5 = 0x9b05688c, H6 = 0x1f83d9ab, H7 = 0x5be0cd19;

  const len = bytes.length;
  const bitLen = len * 8;
  const newLen = ((len + 8) >> 6 << 6) + 64;
  const padded = new Uint8Array(newLen);
  padded.set(bytes);
  padded[len] = 0x80;

  // Append 64-bit length big-endian
  const view = new DataView(padded.buffer);
  view.setUint32(newLen - 4, bitLen & 0xffffffff, false);
  view.setUint32(newLen - 8, Math.floor(bitLen / 0x100000000), false);

  const W = new Uint32Array(64);
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));

  for (let i = 0; i < newLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = H0, b = H1, c = H2, d = H3, e = H4, f = H5, g = H6, h = H7;

    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    H0 = (H0 + a) >>> 0;
    H1 = (H1 + b) >>> 0;
    H2 = (H2 + c) >>> 0;
    H3 = (H3 + d) >>> 0;
    H4 = (H4 + e) >>> 0;
    H5 = (H5 + f) >>> 0;
    H6 = (H6 + g) >>> 0;
    H7 = (H7 + h) >>> 0;
  }

  const hex = [H0, H1, H2, H3, H4, H5, H6, H7]
    .map((v) => v.toString(16).padStart(8, "0"))
    .join("");
  return hex;
}

export interface CreateProvenanceOptions {
  documentHash: string;
  processingRunId?: string;
  source?: "LIVE_CAMERA" | "FILE_UPLOAD" | "camera" | "upload";
  fileSizeBytes?: number;
  mimeType?: string;
  fileName?: string;
  dimensions?: { width: number; height: number };
}

/**
 * Generates an immutable provenance object linking a file or camera frame
 * to a distinct document ID, run ID, and cryptographic SHA-256 hash.
 */
export function createDocumentProvenance(
  optsOrFile: CreateProvenanceOptions
): DocumentProvenance;
export function createDocumentProvenance(
  optsOrFile: File | Blob,
  source: "LIVE_CAMERA" | "FILE_UPLOAD" | "camera" | "upload",
  dimensions?: { width: number; height: number },
  hash?: string
): DocumentProvenance;
export function createDocumentProvenance(
  optsOrFile: File | Blob | CreateProvenanceOptions,
  sourceParam?: "LIVE_CAMERA" | "FILE_UPLOAD" | "camera" | "upload",
  dimensionsParam?: { width: number; height: number },
  hashParam?: string
): DocumentProvenance {
  const now = new Date().toISOString();
  const runRand = Math.random().toString(36).substring(2, 9).toUpperCase();

  if ("documentHash" in optsOrFile && typeof optsOrFile.documentHash === "string") {
    const opts = optsOrFile as CreateProvenanceOptions;
    const hash = opts.documentHash;
    const runId = opts.processingRunId || `RUN-${Date.now().toString(36).toUpperCase()}-${runRand}`;
    const docId = `DOC-${hash.substring(0, 12).toUpperCase()}`;
    const rawSource = opts.source || "upload";
    const source = rawSource === "camera" || rawSource === "LIVE_CAMERA" ? "LIVE_CAMERA" : "FILE_UPLOAD";
    return {
      documentId: docId,
      documentVersion: 1,
      processingRunId: runId,
      documentHash: hash,
      source,
      mimeType: opts.mimeType || "image/jpeg",
      fileSizeBytes: opts.fileSizeBytes ?? 0,
      dimensions: opts.dimensions,
      timestamp: now,
    };
  }

  const file = optsOrFile as File | Blob;
  const hash = hashParam || "";
  const runId = `RUN-${Date.now().toString(36).toUpperCase()}-${runRand}`;
  const docId = hash ? `DOC-${hash.substring(0, 12).toUpperCase()}` : `DOC-${runRand}`;
  const rawSource = sourceParam || "FILE_UPLOAD";
  const source = rawSource === "camera" || rawSource === "LIVE_CAMERA" ? "LIVE_CAMERA" : "FILE_UPLOAD";

  return {
    documentId: docId,
    documentVersion: 1,
    processingRunId: runId,
    documentHash: hash,
    source,
    mimeType: file.type || "image/jpeg",
    fileSizeBytes: file.size,
    dimensions: dimensionsParam,
    timestamp: now,
  };
}
