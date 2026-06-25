/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
          primary: "#EEFE00",
          dark: "#121214",
          white: "#F7F7F7",
          red: "#F24333",
      }
    },
  },
  plugins: [],
}
