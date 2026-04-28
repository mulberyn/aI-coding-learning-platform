import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        paper: "#f8fafc",
        accent: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34, 211, 238, 0.18), 0 24px 80px rgba(15, 23, 42, 0.22)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(34,211,238,0.18), transparent 45%), linear-gradient(180deg, rgba(15,23,42,0.96), rgba(15,23,42,0.88))",
      },
    },
  },
  plugins: [],
};

export default config;
