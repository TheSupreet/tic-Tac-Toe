import React, { useEffect, useState } from "react";

const Cell = ({ value, onClick }) => (
  <button className="cell" onClick={onClick} disabled={value !== null} aria-label="board cell">
    {value === "X" ? <span className="x-mark">X</span> : value === "O" ? <span className="o-mark">O</span> : null}
  </button>
);

export default function Board({ socket, onMoveMade }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [status, setStatus] = useState("waiting");

  useEffect(() => {
    function onState(s) {
      setBoard(s.board);
      setTurn(s.turn);
      setStatus(s.status);
      onMoveMade?.(s.turn, s); // pass full state up for winner banner
    }
    socket.on("state", onState);
    return () => socket.off("state", onState);
  }, [socket, onMoveMade]);

  const canClick = status === "playing";

  function handleClick(i) {
    if (!canClick || board[i]) return;
    socket.emit("move", { index: i });
  }

  return (
    <div className="board">
      {Array.from({ length: 9 }, (_, i) => (
        <Cell key={i} value={board[i]} onClick={() => handleClick(i)} />
      ))}
    </div>
  );
}
