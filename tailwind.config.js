/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        'wine-dark': '#471421',
        'wine': '#6F1C35',
        'sand': '#EADACC',
        'cream': '#EFEBE8',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['"Montserrat"', 'sans-serif'],
      },
      keyframes: {
        "fade-out-overlay": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-out-overlay": "fade-out-overlay 1.2s ease-out forwards",
      },
      backgroundImage: {
        'grape-pattern': "url('https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/uvas.png')"
      }
    },
  },
  plugins: [],
}
