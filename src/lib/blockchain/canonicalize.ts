/**
 * TRUSTGATE AI — JSON Canonicalization Scheme (RFC 8785 JCS)
 * 
 * Guarantees bit-for-bit identical JSON serialization for cryptographic
 * evidence manifests across client browsers, Node.js, Python, and Go runners.
 * 
 * Rules:
 * 1. Object keys are lexicographically sorted by UTF-16 code units.
 * 2. No insignificant whitespace (no indent, no space after ':' or ',').
 * 3. Numbers are formatted strictly without trailing zeros or unnecessary exponent.
 * 4. Strings are escaped according to JSON standard specifications.
 */

export function canonicalizeJson(value: any): string {
  if (value === null) {
    return "null";
  }

  const type = typeof value;

  if (type === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Cannot canonicalize non-finite number");
    }
    // Standard JSON number serialization
    return JSON.stringify(value);
  }

  if (type === "boolean") {
    return value ? "true" : "false";
  }

  if (type === "string") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => {
      const canonical = canonicalizeJson(item);
      return canonical === undefined ? "null" : canonical;
    });
    return `[${items.join(",")}]`;
  }

  if (type === "object") {
    // Sort keys strictly by UTF-16 code unit values
    const sortedKeys = Object.keys(value).sort((a, b) => {
      const minLen = Math.min(a.length, b.length);
      for (let i = 0; i < minLen; i++) {
        const codeA = a.charCodeAt(i);
        const codeB = b.charCodeAt(i);
        if (codeA !== codeB) return codeA - codeB;
      }
      return a.length - b.length;
    });

    const entries: string[] = [];
    for (const key of sortedKeys) {
      const val = value[key];
      if (val !== undefined && typeof val !== "function" && typeof val !== "symbol") {
        const canonicalVal = canonicalizeJson(val);
        entries.push(`${JSON.stringify(key)}:${canonicalVal}`);
      }
    }
    return `{${entries.join(",")}}`;
  }

  return undefined as any;
}
