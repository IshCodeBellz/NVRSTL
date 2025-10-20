/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      container: { center: true, padding: "1rem" },
      colors: {
        brand: {
          DEFAULT: "#2d2d2d",
          accent: "#ff385c",
        },
      },
    },
  },
  plugins: [],
};
