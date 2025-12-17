import { io, Socket } from "socket.io-client";
import { API_URL } from "./gemini";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket"],
      autoConnect: true,
    });
  }
  return socket;
}
