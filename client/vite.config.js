import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:5000",
        ws: true,
        changeOrigin: true,
      },
    },
  },

  build: {
    // Target modern browsers — smaller output, no legacy polyfills.
    target: "es2020",

    // Don't include source maps in production build (saves ~30-50% bundle size).
    sourcemap: false,

    // Warn if any single chunk exceeds 500 KB.
    chunkSizeWarningLimit: 500,

    rollupOptions: {
      output: {
        /**
         * Manual chunk splitting strategy:
         *
         * Why this matters:
         *  - Without splitting, ALL JS is in one bundle (often 600 KB+).
         *  - With splitting, vendor libraries (React, React Router, React Query)
         *    are cached by the browser across deploys — users only re-download
         *    YOUR code when you push an update, not the entire vendor bundle.
         *
         * Chunks produced:
         *  - vendor-react      → react, react-dom (rarely changes)
         *  - vendor-router     → react-router-dom
         *  - vendor-query      → @tanstack/react-query
         *  - vendor-libs       → all other node_modules
         *  - index             → your app entry
         */
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/")) {
              return "vendor-react";
            }
            if (id.includes("react-router")) {
              return "vendor-router";
            }
            if (id.includes("@tanstack")) {
              return "vendor-query";
            }
            // All other node_modules go into a shared vendor chunk.
            return "vendor-libs";
          }
          // Your own code is split automatically by Vite based on dynamic imports.
          return undefined;
        },

        // Content-hashed filenames for long-lived CDN caching.
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});

