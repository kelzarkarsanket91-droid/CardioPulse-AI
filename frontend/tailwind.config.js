/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0d2340",
          50: "#eef3f8",
          100: "#d6e2ee",
          400: "#385a80",
          700: "#122e52",
          800: "#0d2340",
          900: "#081729",
          950: "#050f1c",
        },
        teal: {
          DEFAULT: "#17b6c4",
          50: "#e9fafb",
          100: "#c9f1f4",
          400: "#2fc9d6",
          500: "#17b6c4",
          600: "#128f9a",
          700: "#0d6b73",
        },
        offwhite: "#f6f7f9",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(13,35,64,0.08), 0 8px 24px -8px rgba(13,35,64,0.10)",
        console: "inset 0 0 40px rgba(23,182,196,0.06)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
