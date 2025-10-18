import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { socket } from "../socket";
import "../ui.css";

export default function Home() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [playerName, setPlayerName] = useState(localStorage.getItem("playerName") || "");
  const [roomCode, setRoomCode] = useState((params.get("room") || "").toUpperCase());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  // Pre-fill from URL (?room=XXXX)
  useEffect(() => {
    const urlRoom = params.get("room");
    if (urlRoom) setRoomCode(urlRoom.toUpperCase());
  }, [params]);

  // Ensure the server knows our name before room ops
  const ensureJoinGame = () => {
    const name = (playerName || "").trim() || "PLAYER";
    localStorage.setItem("playerName", name);
    socket.emit("joinGame", { name });
    return name;
  };

  const handleCreate = () => {
    setMessage("");
    const name = ensureJoinGame();
    setBusy(true);
    socket.emit("room:create", null, ({ roomId }) => {
      setBusy(false);
      if (!roomId) return setMessage("Failed to create room.");
      // Push ?room= to URL and go to /game
      navigate(`/game?room=${roomId}`);
    });
  };

  const handleJoin = () => {
    setMessage("");
    const name = ensureJoinGame();
    const code = (roomCode || "").trim().toUpperCase();
    if (!code) return setMessage("Enter a room code.");
    setBusy(true);
    socket.emit("room:join", { roomId: code, name }, (res) => {
      setBusy(false);
      if (!res?.ok) return setMessage(res?.error || "Join failed.");
      navigate(`/game?room=${code}`);
    });
  };

  return (
    <div className="app-center">
      <div className="game-card" style={{ maxWidth: 520 }}>
        <h2 className="title">Tic-Tac-Toe</h2>

        <div className="form-row">
          <label className="label">Your name</label>
          <input
            className="room-input"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g., Ace"
            maxLength={20}
          />
        </div>

        <div className="form-row">
          <label className="label">Room code</label>
          <div className="room-row">
            <input
              className="room-input"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Q7Z3KX"
              maxLength={8}
            />
            <button className="room-btn" onClick={handleJoin} disabled={busy}>
              {busy ? "Joining…" : "Join Room"}
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="room-row">
            <button className="room-btn" onClick={handleCreate} disabled={busy}>
              {busy ? "Creating…" : "Create New Room"}
            </button>
          </div>
        </div>

        {message && <div className="room-msg">{message}</div>}
      </div>
    </div>
  );
}
