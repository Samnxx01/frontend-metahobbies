import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const buildId = process.env.WEBSITE_DEPLOYMENT_ID
    || process.env.BUILD_BUILDID
    || new Date().toISOString();

const versionManifestPlugin = {
    name: "mabs-version-manifest",
    generateBundle() {
        this.emitFile({
            type: "asset",
            fileName: "version.json",
            source: JSON.stringify({ buildId }),
        });
    },
};

export default defineConfig({
    plugins: [react(), versionManifestPlugin],
    define: {
        __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    resolve: {
        alias: { "@": path.resolve(__dirname, "./src") },
    },
    // Las paginas se cargan por glob perezoso y las rutas se resuelven contra el
    // backend, asi que Vite no ve estas dependencias al arrancar: las descubre al
    // entrar a la vista y re-optimiza en caliente, invalidando los chunks ya
    // servidos (504 Outdated Optimize Dep). Declararlas las pre-empaqueta de una.
    optimizeDeps: {
        include: ["jsbarcode"],
    },
    server: {
        proxy: {
            "/api": {
                //target: "https://server-mabs-1.onrender.com",
                target: "http://localhost:8080",
                changeOrigin: true,
                secure: false,
                // Añadimos esto para asegurarnos de que reconozca la ruta
                configure: (proxy, _options) => {
                    proxy.on('error', (err, _req, _res) => {
                        console.log('proxy error', err);
                    });
                    proxy.on('proxyReq', (proxyReq, req, _res) => {
                        console.log('Enviando petición al Target:', req.method, req.url);
                    });
                },
            },
            "/socket.io": {
                //target: "https://server-mabs-1.onrender.com",
                target: "http://localhost:8080",
                ws: true,
            },
        },
    },
});
