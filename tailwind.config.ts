import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2dd4bf",
          dark: "#0d9488",
          light: "#5eead4",
        },
        surface: {
          DEFAULT: "#0a0c11",
          raised: "#12151d",
          card: "#161a24",
          border: "#232836",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45,212,191,0.15), 0 8px 24px rgba(45,212,191,0.08)",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        blink: "blink 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
