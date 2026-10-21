/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      /* ── Design Tokens ── */
      colors: {
        /* Surface palette — CSS-var driven for light/dark switching */
        ink: {
          DEFAULT: "rgb(var(--color-ink) / <alpha-value>)",
          card: "rgb(var(--color-ink-card) / <alpha-value>)",
          raised: "rgb(var(--color-ink-raised) / <alpha-value>)",
          border: "rgb(var(--color-ink-border) / <alpha-value>)",
        },
        /* Brand accent */
        signal: {
          blue:   "#0EA5E9",   /* sky-500 — primary CTA / active state */
          cyan:   "#06B6D4",   /* cyan-500 — secondary accent */
          purple: "#A855F7",   /* purple-500 — tertiary */
        },
        /* Semantic risk levels */
        risk: {
          low:    "#10B981",   /* emerald-500 */
          medium: "#F59E0B",   /* amber-500 */
          high:   "#EF4444",   /* red-500 */
        },
        /* Surface tones (light-mode neutral palette) */
        surface: {
          DEFAULT: "#FFFFFF",
          raised:  "#F8FAFC",
          muted:   "#F1F5F9",
          border:  "#E2E8F0",
        },
      },
      /* ── Typography scale ── */
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs:    ["0.75rem",  { lineHeight: "1rem" }],
        sm:    ["0.875rem", { lineHeight: "1.25rem" }],
        base:  ["1rem",     { lineHeight: "1.5rem" }],
        lg:    ["1.125rem", { lineHeight: "1.75rem" }],
        xl:    ["1.25rem",  { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem",   { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem",  { lineHeight: "2.5rem" }],
      },
      /* ── Spacing extensions ── */
      spacing: {
        4.5:  "1.125rem",
        13:   "3.25rem",
        15:   "3.75rem",
        18:   "4.5rem",
        22:   "5.5rem",
        76:   "19rem",
        88:   "22rem",
        100:  "25rem",
        112:  "28rem",
        128:  "32rem",
      },
      /* ── Border radii ── */
      borderRadius: {
        card: "14px",
        xl:   "12px",
        "2xl":"16px",
        "3xl":"20px",
      },
      /* ── Shadows ── */
      boxShadow: {
        "2xs":    "0 1px 2px 0 rgb(0 0 0 / 0.04)",
        xs:       "0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)",
        sm:       "0 2px 4px 0 rgb(0 0 0 / 0.07), 0 1px 3px -1px rgb(0 0 0 / 0.07)",
        panel:    "0 4px 24px -4px rgb(0 0 0 / 0.18), 0 2px 8px -2px rgb(0 0 0 / 0.12)",
        "panel-lg": "0 8px 40px -8px rgb(0 0 0 / 0.25), 0 4px 16px -4px rgb(0 0 0 / 0.15)",
        glow:     "0 0 20px -2px rgb(14 165 233 / 0.22)",
        "glow-lg":"0 0 40px -4px rgb(14 165 233 / 0.28)",
        "inset-sm":"inset 0 1px 2px 0 rgb(0 0 0 / 0.06)",
      },
      /* ── Keyframes ── */
      keyframes: {
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%":   { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        pulseSoft: "pulseSoft 2s ease-in-out infinite",
        fadeIn:    "fadeIn 0.18s ease-out",
        slideIn:   "slideIn 0.18s ease-out",
        scaleIn:   "scaleIn 0.15s ease-out",
        shimmer:   "shimmer 2s linear infinite",
      },
      /* ── Content widths ── */
      maxWidth: {
        "8xl":  "88rem",
        "9xl":  "96rem",
        "10xl": "104rem",
      },
      /* ── Focus ring ── */
      ringColor: {
        DEFAULT: "#0EA5E9",
      },
      ringOffsetColor: {
        ink: "#020617",
      },
    },
  },
  plugins: [],
};
