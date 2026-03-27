import { io } from "socket.io-client";

const socket = io("http://localhost:5001", {
    transports: ["websocket"], // Use WebSocket explicitly 
    withCredentials: true, // Include cookies and credentials
    
});

export default socket;

// taskkill /IM node.exe /F (to close all node processes)

