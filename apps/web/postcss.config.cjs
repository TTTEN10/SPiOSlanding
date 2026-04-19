const path = require('path');

// Pin Tailwind config so `vite build --config apps/web/vite.config.ts` from the monorepo
// root still loads `apps/web/tailwind.config.ts` (otherwise content/theme are empty).
module.exports = {
  plugins: {
    tailwindcss: {
      config: path.resolve(__dirname, 'tailwind.config.ts'),
    },
    autoprefixer: {},
  },
};
