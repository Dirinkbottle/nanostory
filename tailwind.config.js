import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#172033',
          900: '#0f172a',
          950: '#020617',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      }
    },
  },
  plugins: [heroui({
    themes: {
      dark: {
        colors: {
          background: "#0a0a0f",
          foreground: "#e2e8f0",
          primary: {
            DEFAULT: "#6366f1",
            foreground: "#FFFFFF",
          },
          secondary: {
            DEFAULT: "#8b5cf6",
            foreground: "#FFFFFF",
          },
          content1: "#0f172a",
          content2: "#1e293b",
          content3: "#334155",
          content4: "#475569",
          focus: "#6366f1",
        }
      },
      light: {
        colors: {
          background: "#f8fafc",
          foreground: "#1e293b",
          primary: {
            DEFAULT: "#4f46e5",
            foreground: "#FFFFFF",
          },
          secondary: {
            DEFAULT: "#7c3aed",
            foreground: "#FFFFFF",
          },
          content1: "#ffffff",
          content2: "#f1f5f9",
          content3: "#e2e8f0",
          content4: "#cbd5e1",
          focus: "#4f46e5",
        }
      }
    }
  })],
}
