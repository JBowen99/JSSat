import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "https://tle.ivanstanojevic.me", // target API base URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "/api/tle/"), // rewrite /api to /sat/api
        secure: false, // if the target is https and has self-signed certs
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
