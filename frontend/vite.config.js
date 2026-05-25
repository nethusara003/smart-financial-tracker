import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const envDir = dirname(fileURLToPath(import.meta.url));
  const env = loadEnv(mode, envDir, "");
  const apiBaseUrl = String(env.VITE_API_URL || "").trim();
  const proxyTarget = String(env.VITE_PROXY_TARGET || "https://smart-financial-tracker.onrender.com").trim();

  // During local dev, proxy /api requests through Vite to avoid browser CORS preflight issues.
  const enableApiProxy = apiBaseUrl.startsWith("/api") || apiBaseUrl.length === 0;

  return {
    plugins: [react()],
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
      ...(enableApiProxy
        ? {
            proxy: {
              "/api": {
                target: proxyTarget,
                changeOrigin: true,
                secure: true,
                configure(proxy) {
                  proxy.on("proxyReq", (proxyReq) => {
                    proxyReq.removeHeader("origin");
                  });
                },
              },
            },
          }
        : {}),
    },
  };
});
