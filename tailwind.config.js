/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#111111",
          surface: "#F7F7F8",
          border: "#E5E7EB",
          "border-subtle": "#F0F0F0",
          muted: "#6B7280",
          pop: "#FA50B5",
        },
      },
      fontFamily: {
        sans: ['"Inter"', "system-ui", "sans-serif"],
        display: ['"Instrument Serif"', "Georgia", "serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      maxWidth: {
        site: "1200px",
        prose: "700px",
        hero: "800px",
      },
      borderRadius: {
        card: "1rem",
        pill: "999px",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
