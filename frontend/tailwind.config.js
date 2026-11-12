/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        noir: '#26160F',
        'deep-noir': '#21150F',
        amber: '#C9872A',
        crimson: '#B96A63',
        'crimson-light': '#F2C6BE',
        parchment: '#F5EDD8',
        ash: '#6B6359',
        'card-surface': '#362218',
        'card-border': '#684B37',
        ink: '#26160F',
        ember: '#B96A63',
        marigold: '#C9872A'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
};
