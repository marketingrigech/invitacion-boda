/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-out-overlay": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-out-overlay": "fade-out-overlay 1.2s ease-out forwards",
      },
    },
  },
  plugins: [],
}
