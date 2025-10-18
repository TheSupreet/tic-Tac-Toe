import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

/** In-memory state (swap for Redis if you want persistence) */
const rooms = new Map(); // roomId -> { board, turn, status, players, names, symbols, winner, winLine }
let queue = []; // simple FIFO matchmaking queue

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function freshState() {
  return {
    board: Array(9).fill(null),
    turn: "X",
    status: "waiting",
    players: [], // socketIds
    names: {}, // socketId -> string
    symbols: {}, // socketId -> "X" | "O"
    winner: null, // "X" | "O" | "draw" | null
    winLine: null, // [a,b,c] or null
  };
}

function roomBroadcast(roomId) {
  const r = rooms.get(roomId);
  if (!r) return;
  io.to(roomId).emit("state", {
    board: r.board,
    turn: r.turn,
    status: r.status,
    names: r.names,
    symbols: r.symbols,
    winner: r.winner,
    winLine: r.winLine,
    roomId,
  });
}

function attachPlayer(roomId, socket, name) {
  const r = rooms.get(roomId);
  if (!r) return;
  if (r.players.length >= 2) return socket.emit("error-msg", "Room full.");

  r.players.push(socket.id);
  r.names[socket.id] = name || `Player-${socket.id.slice(0, 4)}`;
  r.symbols[socket.id] = r.players.length === 1 ? "X" : "O";
  socket.join(roomId);

  if (r.players.length === 2) r.status = "playing";
  roomBroadcast(roomId);
}

function checkWinner(board) {
  for (const [a, b, c] of WIN_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { winner: board[a], winLine: [a, b, c] };
    }
  }
  if (board.every(Boolean)) return { winner: "draw", winLine: null };
  return { winner: null, winLine: null };
}

io.on("connection", (socket) => {
  let currentRoom = null;

  socket.on("joinGame", ({ name }) => {
    socket.data.name = name || `Player-${socket.id.slice(0, 4)}`;
  });

  /** Quick matchmaking */
  socket.on("queue:join", () => {
    if (queue.includes(socket.id)) return;
    queue.push(socket.id);
    if (queue.length >= 2) {
      const p1 = queue.shift();
      const p2 = queue.shift();
      const roomId = nanoid(6).toUpperCase();
      rooms.set(roomId, freshState());
      attachPlayer(roomId, io.sockets.sockets.get(p1), io.sockets.sockets.get(p1)?.data?.name);
      attachPlayer(roomId, io.sockets.sockets.get(p2), io.sockets.sockets.get(p2)?.data?.name);
      currentRoom = roomId;
      roomBroadcast(roomId);
      io.to(roomId).emit("match:ready", { roomId });
    } else {
      socket.emit("queue:waiting");
    }
  });

  socket.on("queue:leave", () => {
    queue = queue.filter((id) => id !== socket.id);
  });

  /** Manual rooms */
  socket.on("room:create", (_, cb) => {
    const roomId = nanoid(6).toUpperCase();
    rooms.set(roomId, freshState());
    cb?.({ roomId });
  });

  socket.on("room:join", ({ roomId, name }, cb) => {
    const r = rooms.get(roomId);
    if (!r) return cb?.({ ok: false, error: "Room not found" });
    attachPlayer(roomId, socket, name || socket.data.name);
    currentRoom = roomId;
    cb?.({ ok: true, roomId });
  });

  /** Authoritative move handling */
  socket.on("move", ({ index }) => {
    const roomId = [...socket.rooms].find((r) => rooms.has(r));
    if (!roomId) return;
    const r = rooms.get(roomId);
    if (r.status !== "playing") return;

    const symbol = r.symbols[socket.id];
    if (!symbol) return; // not seated

    if (r.turn !== symbol) return; // not your turn
    if (index < 0 || index > 8) return;
    if (r.board[index]) return; // already occupied

    r.board[index] = symbol;
    const { winner, winLine } = checkWinner(r.board);
    if (winner) {
      r.winner = winner;
      r.winLine = winLine;
      r.status = "ended";
    } else {
      r.turn = r.turn === "X" ? "O" : "X";
    }
    roomBroadcast(roomId);
  });

  /** Reset (server decides) */
  socket.on("reset", () => {
    const roomId = [...socket.rooms].find((r) => rooms.has(r));
    if (!roomId) return;
    const prev = rooms.get(roomId);
    const next = freshState();
    // keep same players and symbols, alternate starting player
    next.players = prev.players.slice();
    next.names = { ...prev.names };
    next.symbols = { ...prev.symbols };
    next.turn = prev.turn === "X" ? "O" : "X";
    next.status = next.players.length === 2 ? "playing" : "waiting";
    rooms.set(roomId, next);
    roomBroadcast(roomId);
  });

  socket.on("disconnect", () => {
    queue = queue.filter((id) => id !== socket.id);
    // remove from any room
    for (const [roomId, r] of rooms) {
      if (!r.players.includes(socket.id)) continue;
      r.players = r.players.filter((p) => p !== socket.id);
      delete r.names[socket.id];
      delete r.symbols[socket.id];
      r.status = "ended";
      io.to(roomId).emit("opponent:left");
      roomBroadcast(roomId);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`TTT server on :${PORT}`));
