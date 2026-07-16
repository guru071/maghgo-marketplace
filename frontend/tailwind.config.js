/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/puck.config.tsx',
  ],
  theme: {
    extend: {
      colors: {
        // `accent` is used in 31 className occurrences (bg-accent, text-accent,
        // border-accent, focus:ring-accent, bg-accent/10) but was never
        // registered here, so Tailwind emitted NO rule for any of them:
        // `bg-accent text-white` rendered white text on no background, making
        // buttons and badges invisible across the app.
        //
        // Literal values rather than var(--accent): the codebase uses opacity
        // modifiers (accent/10, /20, /30) and Tailwind can only apply those to
        // a colour it can parse. Keep in sync with --accent* in globals.css.
        //
        // The other design tokens (--text-primary, --bg-card, ...) are used
        // only as var() references in CSS and inline styles, never as Tailwind
        // classes, so they intentionally are not declared here.
        accent: {
          DEFAULT: '#FF7518', // --accent (brand orange)
          hover: '#E66A15',   // --accent-hover
          light: '#E07A5F',   // --accent-light (used at 10% opacity)
        },
      },
    },
  },
  plugins: [],
}