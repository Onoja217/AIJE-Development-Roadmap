import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const deploymentEnvironment = env.VITE_DEPLOYMENT_ENV;

  if (mode === "production") {
    if (!deploymentEnvironment) {
      throw new Error(
        "VITE_DEPLOYMENT_ENV is required for production builds (preview, staging, or production).",
      );
    }
    if (
      deploymentEnvironment === "production" &&
      env.VITE_COMMUNITY_SYNC_MODE !== "live"
    ) {
      throw new Error(
        "Production deployments require VITE_COMMUNITY_SYNC_MODE=live; demo fallback is forbidden.",
      );
    }
  }

  return {
    server: {
      host: "::",
      port: 8082,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(
      Boolean,
    ),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
