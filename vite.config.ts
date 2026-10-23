import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
export default defineConfig({
  appType: "spa",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@assets": path.resolve(__dirname, "src/attached_assets"),
      "@lib": path.resolve(__dirname, "src/lib"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.VITE_PORT || "7788"),
    // Local dev: forward /api to the UAT backend so browser requests are
    // same-origin. UAT Apache's CORS allow-list doesn't yet include
    // `Idempotency-Key` (required by POST /v1/reseller/orders), and a
    // cross-origin request would fail preflight. In dev the Vite proxy
    // removes CORS from the equation entirely. (`.env.development.local`
    // sets VITE_BRAND_API_URL=/api — dev-only, never used at build time.)
    proxy: {
      "/api": {
        target: "https://vdspbck.sabbpe.com",
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "0.0.0.0",
    port: parseInt(process.env.VITE_PORT || "7788"),
    allowedHosts: ["gift360.io", "www.gift360.io", "uat.gift360.io"],
  },
});
