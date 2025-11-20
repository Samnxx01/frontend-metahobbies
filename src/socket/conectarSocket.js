import { io } from "socket.io-client";
let socket = null;
export const conectarSocket = () => {
    const token = localStorage.getItem("token");


    if (!token) {
        console.warn("⚠️ No token → No me conecto al socket");
        return null;
    }

    const socket = io("https://server-mabs-xo9s.onrender.com", {
        auth: { token },
        transports: ["websocket"],
        reconnection: true,
    });

    setSocket(socket); // <
    socket.on("connect", () => {
        console.log("⚡ Socket conectado:", socket.id);
    });

    socket.on("disconnect", () => {
        console.log("🔴 Socket desconectado");
    });

    setInterval(() => {
        socket.emit("ping-usuario");
    }, 1000);

    return socket;
};
export const desconectadoUsu = () => {
    if (socket && socket.connected) {
        socket.disconnect();
        console.log("🔌 Socket desconectado");
    }
};
export const setSocket = (instance) => {
    socket = instance;
};