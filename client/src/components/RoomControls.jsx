import React, { useEffect, useMemo, useState } from "react";

export default function RoomControls({ socket, playerName, onRoomChanged }) {
  const [roomId, setRoomId] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState("");

  // auto-read ?room=XXXX from URL for easy joining
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefill = params.get("room");
    if (prefill) setRoomId(prefill.toUpperCase());
  }, []);

  const inviteUrl = useMemo(() => {
    if (!roomId) return "";
    const u = new URL(window.location.href);
    u.searchParams.set("room", roomId);
    return u.toString();
  }, [roomId]);

  const createRoom = () => {
    setMsg("");
    setCreating(true);
    socket.emit("room:create", null, ({ roomId: newId }) => {
      setCreating(false);
      setRoomId(newId);
      // update URL for easy share
      const u = new URL(window.location.href);
      u.searchParams.set("room", newId);
      window.history.replaceState({}, "", u.toString());
      onRoomChanged?.(newId);
      setMsg(`Room created: ${newId}`);
    });
  };

  const joinRoom = () => {
    const id = (roomId || "").trim().toUpperCase();
    if (!id) {
      setMsg("Enter a room code first.");
      return;
    }
    setJoining(true);
    socket.emit("room:join", { roomId: id, name: playerName }, (res) => {
      setJoining(false);
      if (!res?.ok) {
        setMsg(res?.error || "Join failed.");
        return;
      }
      // persist URL
      const u = new URL(window.location.href);
      u.searchParams.set("room", id);
      window.history.replaceState({}, "", u.toString());
      onRoomChanged?.(id);
      setMsg(`Joined room: ${id}`);
    });
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl || "");
      setMsg("Invite link copied!");
    } catch {
      setMsg("Copy failed — copy manually.");
    }
  };

  return (
    <div className="room-controls">
      <div className="room-row">
        <input className="room-input" value={roomId} onChange={(e) => setRoomId(e.target.value.toUpperCase())} placeholder="ROOM CODE" maxLength={8} />
        <button className="room-btn" onClick={joinRoom} disabled={joining}>
          {joining ? "Joining…" : "Join Room"}
        </button>
        <button className="room-btn" onClick={createRoom} disabled={creating}>
          {creating ? "Creating…" : "Create Room"}
        </button>
      </div>

      <div className="room-row">
        <input className="room-link" value={inviteUrl} readOnly placeholder="Invite link will appear here" />
        <button className="room-btn" onClick={copyInvite} disabled={!inviteUrl}>
          Copy Link
        </button>
      </div>

      {msg && <div className="room-msg">{msg}</div>}
    </div>
  );
}
