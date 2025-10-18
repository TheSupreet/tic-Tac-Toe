// inside Game.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Board from "../components/Board";
import { socket } from "../socket";
import "../ui.css";

export default function Game() {
  const [params] = useSearchParams();
  const playerName = localStorage.getItem("playerName") || "ACE";

  const [opponentName, setOpponentName] = useState("—");
  const [turn, setTurn] = useState("X");
  const [roomId, setRoomId] = useState(params.get("room")?.toUpperCase() || null);
  const [status, setStatus] = useState("waiting");
  const [winnerText, setWinnerText] = useState(""); // NEW

  useEffect(() => {
    socket.emit("joinGame", { name: playerName });

    const onState = (s) => {
      setStatus(s.status);
      if (s.roomId) setRoomId(s.roomId);

      const opp = Object.keys(s.symbols || {}).find((sid) => sid !== socket.id);
      if (opp && s.names?.[opp]) setOpponentName(s.names[opp]);

      // winner banner
      if (s.winner) {
        if (s.winner === "draw") setWinnerText("It’s a draw");
        else {
          const winnerSid = Object.entries(s.symbols || {}).find(([_, sym]) => sym === s.winner)?.[0];
          const name = s.names?.[winnerSid] || s.winner;
          setWinnerText(`${name} wins!`);
        }
      } else {
        setWinnerText("");
      }
    };

    socket.on("state", onState);
    socket.on("opponent:left", () => setStatus("ended"));

    const urlRoom = params.get("room");
    if (urlRoom) socket.emit("room:join", { roomId: urlRoom.toUpperCase(), name: playerName }, () => {});

    return () => {
      socket.off("state", onState);
      socket.off("opponent:left");
    };
  }, [playerName, params]);

  const TurnIcon = useMemo(() => (turn === "O" ? <span className="o-dot" /> : null), [turn]);

  return (
    <div className="app-center">
      <div className="game-card">
        <div className="names">
          <div className="name-block">
            <div className="name-title">{playerName}</div>
            <div className="name-sub">[you]</div>
          </div>
          <div className="name-block">
            <div className="name-title">{opponentName}</div>
            <div className="name-sub">[opp]</div>
          </div>
        </div>

        <div className="turn">
          {TurnIcon}
          <span>{turn} Turn</span>
          <span className="room-pill">{roomId ? `Room: ${roomId}` : "No room"}</span>
          <span className={`status-pill ${status}`}>{status}</span>
        </div>

        {/* Winner banner (no white overlay, just text) */}
        {winnerText && <div className="winner-banner">{winnerText}</div>}

        <Board socket={socket} onMoveMade={(nextTurn /*, state*/) => setTurn(nextTurn)} />

        <div className="footer-row">
          <button className="footer-btn" onClick={() => socket.emit("reset")}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
