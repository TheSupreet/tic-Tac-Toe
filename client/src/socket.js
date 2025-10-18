import { io } from "socket.io-client";

// One shared Socket.IO client for the whole app
export const socket = io("http://localhost:5000", { autoConnect: true });
