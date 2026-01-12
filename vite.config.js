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
            "/socket.io": {
                target: "https://server-mabs-xo9s.onrender.com",
                ws: true,
            },
            "/api": {
                target: "https://server-mabs-xo9s.onrender.com",
                changeOrigin: true,
            },
        },
    },
});
