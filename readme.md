# 🎮 Multiplayer Tic-Tac-Toe (Rooms, Server-Authoritative)

Real-time Tic-Tac-Toe with **React** + **Socket.IO** + **Node.js**.  
Players create or join a **room code** and the **server** validates every move.

---

## ✨ Features
- 🔗 Create / Join via **room code** or invite URL (`/game?room=ABC123`)
- 🧠 **Server-authoritative**: turn order, cell occupancy, win/draw checked on server
- 👥 2 players per room with X/O assignment
- 🔄 Reset / rematch
- 🏆 Winner banner (no overlay)
- ⚡ WebSocket updates (Socket.IO v4)

---

## 🛠 Tech
- **Client:** React, socket.io-client
- **Server:** Node.js, Express, socket.io
- **Styling:** CSS (ui.css)

---

## 📂 Structure
tic-tac-toe/
├─ client/
│ ├─ src/
│ │ ├─ pages/
│ │ │ ├─ Home.jsx # name + create/join room (on Home)
│ │ │ └─ Game.jsx # board view & reset
│ │ ├─ components/
│ │ │ └─ Board.jsx # 3x3 grid (no local state mutations)
│ │ ├─ socket.js # shared Socket.IO client
│ │ └─ ui.css # styles
│ └─ package.json
├─ server/
│ ├─ index.js # Express + Socket.IO (authoritative rules)
│ └─ package.json
└─ README.md


## 🎮 How to Play (Super Simple)

1) **Player A (Host)**
- Open the app Home page, type your name, click **Create Room**.
- You’ll be taken to the game at a URL like:  
  `http://localhost:5173/game?room=SSERF-`  
  👉 **Copy the code at the end of the URL** (everything after `room=` — e.g., `SSERF-`).

2) **Share the Code**
- Send that code to your friend (Player B) over chat.

3) **Player B (Joiner)**
- Open the app Home page, type your name.
- Paste the code into the **Room code** input and click **Join Room**.  
  _Alternatively_, open the full invite link that Player A sent (`/game?room=SSERF-`).

4) **Play!**
- The server assigns **X/O** and enforces turns.
- Click cells to place your mark when it’s **your** turn.
- When the game ends, you’ll see **“<winner name> wins!”** or **“It’s a draw.”**
- Click **Reset** to rematch in the same room.

> Tip: You can also copy the **entire URL** and send it; opening it directly will auto-join the room.
