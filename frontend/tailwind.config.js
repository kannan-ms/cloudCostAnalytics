/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          blue: '#2962ff',
          hover: '#1e54e4',
        },
        sidebar: {
          bg: '#0b1136',
          hover: '#16204e',
          text: '#ffffff',
          'text-muted': '#8b9bb4',
        },
        text: {
          dark: '#1a1f36',
          medium: '#4c5a75',
          light: '#8792a2',
        },
        border: {
          light: '#e0e6ed',
        },
        status: {
          success: '#00c853',
          warning: '#ffab00',
          error: '#ff3d00',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Open Sans', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}
