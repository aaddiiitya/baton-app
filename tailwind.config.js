/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef6f5', 100: '#d5e9e6', 200: '#abd3cd', 300: '#7bb8b0',
          400: '#4a9990', 500: '#2a7c73', 600: '#0f5c55', 700: '#0c4c46',
          800: '#0a3d38', 900: '#072e2a',
        },
        canvas: '#f5f4f0',
        ink: '#1a2320',
        muted: '#5f6b66',
        line: '#e3e1db',
        resident: {
          orange: '#b5633a', blue: '#4a6fa0', purple: '#7d5595',
          green: '#5a7d4f', grey: '#808080',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
