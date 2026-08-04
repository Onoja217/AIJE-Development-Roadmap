import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8082,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@tensorflow") || id.includes("coco-ssd")) return "vendor-tfjs";
          if (id.includes("face-api")) return "vendor-faceapi";
          if (id.includes("leaflet")) return "vendor-maps";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("hls.js")) return "vendor-hls";
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) {
            return "vendor-react";
          }
          return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
