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
    port: 7788,
    open: true,
    allowedHosts: ['giftvouchersuat.sabbpe.com','uat.gift360.io','pymntsuat.gift360.io','gvauth.sabbpe.com','vdspbck.sabbpe.com','notificationsuat.sabbpe.com']
  },
  preview: {
    host: "0.0.0.0",
    port: 7788,
    allowedHosts: ["gift360.io", "www.gift360.io", "uat.gift360.io"],
  },
});
