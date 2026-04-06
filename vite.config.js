import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
        proxy: {
            "/api": {
                target: "https://server-mabs-xo9s.onrender.com",
                //target: "http://localhost:8080",
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
                target: "https://server-mabs-xo9s.onrender.com",
                //target: "http://localhost:8080",
                ws: true,
            },
        },
    },
});
