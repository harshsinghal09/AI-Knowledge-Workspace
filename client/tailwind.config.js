/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12161C",
        paper: "#F7F7F5",
        line: "#E4E4E0",
        accent: "#2F5D50",
        accentSoft: "#DCE8E3",
        rust: "#B4552A"
      },
      fontFamily: {
        display: ["'IBM Plex Serif'", "serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"]
      }
    }
  },
  plugins: []
};
