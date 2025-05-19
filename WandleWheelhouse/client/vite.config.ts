import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    port: 5174, // <--- SET THE PORT HERE
    proxy: {
      "/api": {
        target: "https://localhost:7136", // Or your local backend HTTP port
        changeOrigin: true,
        secure: false, // If backend uses self-signed cert
      },
    },
  },
});
