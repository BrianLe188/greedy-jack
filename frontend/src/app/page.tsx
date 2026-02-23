"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

type GameStatus =
  | "waiting"
  | "dealing"
  | "betting"
  | "deciding"
  | "bidding"
  | "rps"
  | "awarding"
  | "game_over";

interface Card {
  suit: string;
  rank: string;
  value: number;
}

interface PlayerState {
  id: string;
  username: string;
  handLength: number;
  score: number | string;
  isStanding: boolean;
  biddingAction: string;
  rpsChoice: string;
  isReady: boolean;
  coins: number;
  currentRoundBet: number;
  hasActed: boolean;
}

interface GameState {
  status: GameStatus;
  publicCard: Card | null;
  players: PlayerState[];
  awardingInfo?: { winnerId: string } | null;
  pot: number;
  currentBet: number;
  bettingTurnId: string | null;
}

interface GameOverResult {
  players: {
    id: string;
    username: string;
    hand: Card[];
    score: number;
    isWinner: boolean;
    coins: number;
  }[];
}

interface RpsResult {
  choices: { id: string; username: string; choice: string }[];
  isTie: boolean;
  winnerId: string | null;
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [privateState, setPrivateState] = useState<{
    hand: Card[];
    score: number;
    rpsChoice?: string;
  } | null>(null);
  const [gameOverResult, setGameOverResult] = useState<GameOverResult | null>(
    null,
  );
  const [username, setUsername] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [joinedRoomId, setJoinedRoomId] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rpsResult, setRpsResult] = useState<RpsResult | null>(null);
  const [betInput, setBetInput] = useState<string>("0");

  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);

    s.on("stateUpdate", (state: GameState) => {
      setGameState(state);
      setActionLoading(false);
      if (state.status !== "game_over") {
        setGameOverResult(null);
      }
    });

    s.on(
      "privateState",
      (state: { hand: Card[]; score: number; rpsChoice?: string }) => {
        setPrivateState(state);
      },
    );

    s.on("gameOver", (result: GameOverResult) => {
      setGameOverResult(result);
    });

    s.on("rpsResult", (result: RpsResult) => {
      setRpsResult(result);
      setTimeout(() => setRpsResult(null), 3500);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleJoin = (isCreate = false) => {
    if (socket && username.trim()) {
      const finalRoomId = isCreate
        ? Math.floor(1000 + Math.random() * 9000).toString()
        : roomIdInput.trim();

      if (!finalRoomId) {
        alert("Please enter a Room ID to join");
        return;
      }
      setJoinedRoomId(finalRoomId);
      socket.emit("join", { username, roomId: finalRoomId });
      setIsJoined(true);
    }
  };

  const handleReady = () => socket?.emit("ready");

  const handleAction = (type: string, payload?: unknown) => {
    setActionLoading(true);
    socket?.emit("action", { type, payload });
  };

  // Render cards
  const renderCard = (card: Card, isLarge = false) => {
    const cardSize = isLarge ? "w-24 h-36 text-3xl" : "w-20 h-28 text-2xl";
    const suitSize = isLarge ? "text-4xl" : "text-3xl";

    return (
      <motion.div
        layout
        initial={{ scale: 0, y: -50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        key={`${card.rank}-${card.suit}`}
        className={`bg-white text-black p-3 border-2 border-slate-300 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between items-center font-bold ${cardSize}`}
      >
        <div className="self-start leading-none">{card.rank}</div>
        <div
          className={`leading-none ${["hearts", "diamonds"].includes(card.suit) ? "text-red-600" : "text-slate-900"} ${suitSize}`}
        >
          {card.suit === "hearts"
            ? "♥️"
            : card.suit === "diamonds"
              ? "♦️"
              : card.suit === "clubs"
                ? "♣️"
                : "♠️"}
        </div>
        <div className="self-end rotate-180 leading-none">{card.rank}</div>
      </motion.div>
    );
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[#064E3B] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#065f46] to-[#022c22] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/80 backdrop-blur-md p-8 rounded-2xl shadow-2xl text-white max-w-md w-full border border-slate-700/50"
        >
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🃏</div>
            <h1 className="text-3xl font-bold text-amber-500">Greedy Jack</h1>
            <p className="text-slate-400 mt-2">
              Enter your name and join or create a room
            </p>
          </div>

          <input
            type="text"
            placeholder="Username"
            className="w-full p-4 rounded-xl mb-4 bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder-slate-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <div className="flex flex-col gap-4 mt-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Room ID"
                className="flex-1 p-4 rounded-xl bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder-slate-500"
                value={roomIdInput}
                onChange={(e) =>
                  setRoomIdInput(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                onKeyDown={(e) => e.key === "Enter" && handleJoin(false)}
              />
              <button
                onClick={() => handleJoin(false)}
                className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-6 py-4 rounded-xl transition-all shadow-md"
              >
                Join
              </button>
            </div>

            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-slate-700 flex-1"></div>
              <div className="text-slate-500 text-sm font-bold">OR</div>
              <div className="h-px bg-slate-700 flex-1"></div>
            </div>

            <button
              onClick={() => handleJoin(true)}
              className="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-900 font-bold py-4 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(217,119,6,0.39)]"
            >
              Create New Room
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const myPlayer = gameState?.players.find((p) => p.id === socket?.id);
  const isPendingAction =
    myPlayer?.biddingAction === "pending" || myPlayer?.rpsChoice === "pending";

  return (
    <div className="min-h-screen bg-[#064E3B] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#065f46] to-[#022c22] text-white p-4 pb-48 font-sans overflow-x-hidden">
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8 p-4 bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-lg border border-slate-700/50">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-3">
            Phase:{" "}
            <span className="text-amber-500 animate-pulse">
              {gameState?.status.toUpperCase()}
            </span>
            <span className="text-sm bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-600 hidden md:block">
              Room ID:{" "}
              <span className="font-mono text-white text-lg">
                {joinedRoomId}
              </span>
            </span>
          </h1>
          <div className="md:hidden mt-2">
            <span className="text-sm bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-600">
              Room ID:{" "}
              <span className="font-mono text-white font-bold">
                {joinedRoomId}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-1.5 rounded-full border border-amber-500/50">
            <span className="text-amber-400 font-bold text-lg">
              💰 POT: {gameState?.pot || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-slate-300">
              {gameState?.players.length}/4 Players
            </span>
          </div>
        </div>
      </header>

      {/* WAITING OVERLAY */}
      {gameState?.status === "waiting" && !myPlayer?.isReady && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center mt-20"
        >
          <button
            onClick={handleReady}
            className="bg-emerald-600 px-10 py-4 rounded-2xl font-bold text-xl hover:bg-emerald-500 shadow-[0_0_30px_rgba(5,150,105,0.4)] transition-all active:scale-95"
          >
            I&apos;m Ready
          </button>
        </motion.div>
      )}

      {/* OPPONENTS AREA */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-12 mb-16">
        {gameState?.players
          .filter((p) => p.id !== socket?.id)
          .map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`relative bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl flex flex-col items-center border shadow-xl ${p.isStanding ? "border-red-500/50 opacity-70" : "border-slate-600/50"}`}
            >
              <div className="absolute -top-4 bg-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-300 shadow-md">
                {gameState?.status === "betting" ? (
                  p.id === gameState.bettingTurnId ? (
                    <span className="text-amber-400 animate-pulse">
                      Betting...
                    </span>
                  ) : (
                    "Waiting"
                  )
                ) : p.biddingAction !== "pending" &&
                  gameState?.status !== "waiting" ? (
                  "Decided 🟢"
                ) : (
                  "Thinking ⏳"
                )}
              </div>
              <div className="mt-2 font-semibold text-amber-400">
                {p.username}
              </div>
              <div className="text-xs text-amber-500/80 font-bold mb-4 bg-amber-500/10 px-2 py-0.5 rounded-full">
                🪙 {p.coins} (Bet: {p.currentRoundBet})
              </div>

              <div className="flex justify-center min-h-[80px]">
                <AnimatePresence>
                  {Array.from({ length: p.handLength }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20, rotate: -10 }}
                      animate={{ opacity: 1, x: 0, rotate: i * 5 - 10 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="w-14 h-20 bg-[url('https://www.transparenttextures.com/patterns/always-grey.png')] bg-slate-600 border-2 border-slate-400 rounded-lg shadow-md -ml-8 first:ml-0 shadow-black/40 flex items-center justify-center"
                    >
                      <div className="w-8 h-12 border border-slate-400/30 rounded-full opacity-50" />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {p.handLength === 0 && (
                  <span className="text-slate-500 italic text-sm mt-4">
                    No cards
                  </span>
                )}
              </div>

              {p.isStanding && (
                <div className="absolute bottom-2 bg-red-600/90 text-white text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                  Standing
                </div>
              )}
              {p.score !== "?" && Number(p.score) > 0 && (
                <div className="absolute -bottom-3 bg-emerald-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                  Score: {p.score}
                </div>
              )}
            </motion.div>
          ))}
      </div>

      {/* PUBLIC BOARD */}
      <div className="flex flex-col items-center justify-center  bg-emerald-800/40 backdrop-blur-md rounded-3xl mb-12 py-10 px-6 shadow-2xl border-2 border-emerald-600/50 w-full max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 to-transparent pointer-events-none" />

        {gameState?.status !== "betting" && (
          <h2 className="text-2xl mb-8 text-emerald-300 font-bold uppercase tracking-widest">
            Public Card Area
          </h2>
        )}

        {gameState?.status !== "betting" && (
          <div className="h-48 flex items-center justify-center perspective-[1000px]">
            <AnimatePresence mode="popLayout">
              {gameState?.publicCard ? (
                <motion.div
                  key="public-card"
                  initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
                  animate={{ rotateY: 0, scale: 1.5, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="z-10"
                >
                  {renderCard(gameState.publicCard, true)}
                </motion.div>
              ) : (
                <motion.div
                  key="empty-slot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-24 h-36 border-4 border-dashed border-emerald-500/40 rounded-xl flex items-center justify-center opacity-70"
                >
                  <span className="text-emerald-500/60 font-medium">Draw</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {gameState?.status === "bidding" && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-12 bg-slate-900/80 px-6 py-2 rounded-full font-bold text-amber-400 z-20"
          >
            Who wants this card?
          </motion.div>
        )}

        {gameState?.status === "awarding" && gameState?.awardingInfo && (
          <motion.div
            initial={{ y: -20, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1.1 }}
            className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-500/90 backdrop-blur-md px-8 py-3 rounded-full font-bold text-slate-900 shadow-[0_0_30px_rgba(245,158,11,0.8)] border-2 border-white"
          >
            🎁 Thuộc về:{" "}
            {
              gameState.players.find(
                (p) => p.id === gameState.awardingInfo?.winnerId,
              )?.username
            }
          </motion.div>
        )}

        {/* BETTING INLINE PANEL */}
        <AnimatePresence>
          {gameState?.status === "betting" && !myPlayer?.isStanding && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md mt-2 z-20 flex flex-col items-center"
            >
              {gameState.bettingTurnId === myPlayer?.id ? (
                <div className="bg-slate-800/90 backdrop-blur-sm p-5 rounded-3xl border-2 border-amber-500 shadow-[0_10px_40px_rgba(245,158,11,0.2)] flex flex-col gap-4 w-full">
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-2">
                    <span className="text-sm text-slate-400 font-bold uppercase">
                      Lượt của bạn
                    </span>
                    <span className="text-sm text-slate-400 uppercase">
                      POT:{" "}
                      <span className="text-amber-500 font-bold">
                        {gameState.pot}
                      </span>
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 text-center">
                    Cược cao nhất:{" "}
                    <span className="font-bold text-amber-500 text-lg">
                      {gameState.currentBet}
                    </span>
                    <br />
                    Cần thêm{" "}
                    <span className="font-bold text-white">
                      {Math.max(
                        0,
                        gameState.currentBet - (myPlayer?.currentRoundBet || 0),
                      )}
                    </span>{" "}
                    để theo (Call).
                  </div>
                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      value={betInput}
                      onChange={(e) => setBetInput(e.target.value)}
                      className="flex-1 bg-slate-900 border-2 border-slate-700/50 rounded-xl px-4 py-3 text-white font-bold text-lg text-center placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="Số xu..."
                      min={Math.max(
                        0,
                        gameState.currentBet - (myPlayer?.currentRoundBet || 0),
                      )}
                      max={myPlayer?.coins || 0}
                    />
                    <button
                      onClick={() => {
                        handleAction("bet", { amount: betInput });
                        setBetInput("0");
                      }}
                      disabled={actionLoading}
                      className="bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-slate-900 font-bold px-6 py-3 rounded-xl text-lg transition-all shadow-lg active:scale-95 whitespace-nowrap"
                    >
                      {parseInt(betInput) ===
                      Math.max(
                        0,
                        gameState.currentBet - (myPlayer?.currentRoundBet || 0),
                      )
                        ? "Call"
                        : "Raise"}
                    </button>
                  </div>
                  {(myPlayer?.coins || 0) <
                    Math.max(
                      0,
                      gameState.currentBet - (myPlayer?.currentRoundBet || 0),
                    ) && (
                    <div className="text-red-400 text-xs text-center font-bold">
                      Không đủ tiền cược, sẽ tự động bỏ bài!
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-800/80 backdrop-blur-sm px-6 py-4 rounded-full border border-slate-700/50 text-center text-slate-400 font-bold flex items-center justify-center gap-3 shadow-lg">
                  <div className="w-6 h-6 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
                  <span>
                    Đang chờ{" "}
                    <span className="text-amber-400">
                      {
                        gameState.players.find(
                          (p) => p.id === gameState.bettingTurnId,
                        )?.username
                      }
                    </span>{" "}
                    cược...
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* RPS RESULT OVERLAY */}
        <AnimatePresence>
          {rpsResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md rounded-3xl"
            >
              <h3 className="text-3xl font-bold text-amber-500 mb-6 uppercase tracking-wider drop-shadow-md">
                {rpsResult.isTie
                  ? "TIE! Vòng quay lại..."
                  : "Kết quả quyết định"}
              </h3>
              <div className="flex gap-6 flex-wrap justify-center items-center">
                {rpsResult.choices.map((c, i) => (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className={`flex flex-col items-center p-4 rounded-2xl border-2 ${c.id === rpsResult.winnerId ? "border-amber-500 bg-amber-500/20 scale-110 shadow-[0_0_20px_rgba(245,158,11,0.5)]" : "border-slate-600 bg-slate-800"}`}
                  >
                    <div className="text-5xl mb-2 drop-shadow-lg">
                      {c.choice === "rock"
                        ? "✊"
                        : c.choice === "paper"
                          ? "✋"
                          : "✌️"}
                    </div>
                    <div className="font-bold text-slate-300">{c.username}</div>
                    {c.id === rpsResult.winnerId && (
                      <div className="text-amber-500 text-xs font-bold mt-1 uppercase">
                        Winner 🎯
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {rpsResult.winnerId && !rpsResult.isTie && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 }}
                  className="mt-8 text-xl text-emerald-400 font-bold bg-emerald-900/50 px-6 py-2 rounded-full"
                >
                  Lá bài sẽ thuộc về:{" "}
                  {
                    rpsResult.choices.find((c) => c.id === rpsResult.winnerId)
                      ?.username
                  }
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MY PLAYER PANEL */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 p-6 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/80 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-40"
      >
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
          {/* My Cards & Info */}
          <div className="flex-1 w-full relative">
            <div className="flex justify-between items-center mb-4">
              <div className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-amber-200 to-amber-500">
                {myPlayer?.username} (You)
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <div className="text-amber-400 font-bold text-sm bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30">
                    🪙 Coins: {myPlayer?.coins}{" "}
                    <span className="text-slate-400 text-xs ml-1">
                      (Betted: {myPlayer?.currentRoundBet})
                    </span>
                  </div>
                </div>
                <div
                  className={`px-4 py-1.5 rounded-full font-mono text-lg font-bold shadow-inner ${(privateState?.score || 0) > 21 ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"}`}
                >
                  Score: {privateState?.score || 0}/21
                  {(privateState?.score || 0) > 21 && " 💥 BUST!"}
                </div>
              </div>
            </div>

            <div className="flex gap-[-20px] pb-2 min-h-[140px] items-end justify-center md:justify-start">
              <AnimatePresence>
                {privateState?.hand.map((card, i) => (
                  <motion.div
                    key={`${card.rank}-${card.suit}`}
                    initial={{ y: 50, opacity: 0, x: 50 }}
                    animate={{
                      y: 0,
                      opacity: 1,
                      x: 0,
                      rotate: (i - privateState.hand.length / 2) * 6,
                    }}
                    className={`-ml-8 first:ml-0 transition-transform hover:-translate-y-6 hover:rotate-0 z-10 hover:z-50`}
                    style={{ zIndex: i }}
                  >
                    {renderCard(card, true)}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[320px] w-full md:w-auto shrink-0">
            {gameState?.status === "deciding" && !myPlayer?.isStanding && (
              <>
                <button
                  onClick={() => handleAction("continue")}
                  disabled={actionLoading || !isPendingAction}
                  className={`p-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all ${
                    actionLoading || !isPendingAction
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600"
                      : "bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-[0_4px_14px_0_rgba(37,99,235,0.39)]"
                  }`}
                >
                  <span>
                    {actionLoading
                      ? "Waiting..."
                      : isPendingAction
                        ? "Tiếp tục (Continue)"
                        : "Đã chọn"}
                  </span>
                </button>

                <button
                  onClick={() => handleAction("stand")}
                  disabled={
                    actionLoading ||
                    !isPendingAction ||
                    (privateState?.score || 0) < 16
                  }
                  className={`p-4 rounded-xl font-bold text-lg transition-all ${
                    actionLoading || !isPendingAction
                      ? "hidden"
                      : (privateState?.score || 0) < 16
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-70"
                        : "bg-rose-600 hover:bg-rose-500 active:scale-95 text-white shadow-[0_4px_14px_0_rgba(225,29,72,0.39)]"
                  }`}
                  title={
                    (privateState?.score || 0) < 16
                      ? "Cần tối thiểu 16 điểm để Bỏ"
                      : "Dừng lại, không rút thêm"
                  }
                >
                  Bỏ - Không rút nữa
                </button>
              </>
            )}

            {gameState?.status === "bidding" && !myPlayer?.isStanding && (
              <>
                <button
                  onClick={() => handleAction("take")}
                  disabled={actionLoading || !isPendingAction}
                  className={`p-4 rounded-xl font-bold text-lg transition-all ${
                    actionLoading || !isPendingAction
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-amber-500 hover:bg-amber-400 text-slate-900 active:scale-95 shadow-[0_4px_14px_0_rgba(245,158,11,0.39)]"
                  }`}
                >
                  Lấy lá bài này 🤚
                </button>
                <button
                  onClick={() => handleAction("skip")}
                  disabled={actionLoading || !isPendingAction}
                  className={`p-4 rounded-xl font-bold text-lg transition-all ${
                    actionLoading || !isPendingAction
                      ? "hidden"
                      : "bg-slate-700 hover:bg-slate-600 active:scale-95 text-white"
                  }`}
                >
                  Bỏ qua ❌
                </button>
              </>
            )}

            {gameState?.status === "rps" && !myPlayer?.isStanding && (
              <div className="flex flex-col items-center">
                <div className="flex gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl">
                  {(["rock", "paper", "scissors"] as const).map((choice) => (
                    <button
                      key={choice}
                      onClick={() => handleAction(choice)}
                      disabled={myPlayer?.rpsChoice !== "pending"}
                      className={`text-4xl p-4 rounded-xl transition-all ${
                        privateState?.rpsChoice === choice
                          ? "scale-110 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10"
                          : myPlayer?.rpsChoice === "pending"
                            ? "bg-slate-700 hover:scale-110 hover:bg-slate-600"
                            : "bg-slate-800 opacity-40 scale-90"
                      }`}
                    >
                      {choice === "rock"
                        ? "✊"
                        : choice === "paper"
                          ? "✋"
                          : "✌️"}
                    </button>
                  ))}
                </div>
                {myPlayer?.rpsChoice !== "pending" && (
                  <div className="mt-3 text-amber-400 font-bold uppercase tracking-widest animate-pulse">
                    Đợi người khác...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* GAME OVER MODAL */}
      <AnimatePresence>
        {gameOverResult && gameState?.status === "game_over" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-amber-500/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(245,158,11,0.2)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center mb-10">
                <h2 className="text-5xl font-bold text-amber-500 mb-2">
                  Game Over!
                </h2>
                <p className="text-slate-400">Kết quả chung cuộc</p>
              </div>

              <div className="flex flex-col gap-4">
                {gameOverResult.players.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 ${p.isWinner ? "bg-gradient-to-r from-amber-600/20 to-transparent border border-amber-500" : "bg-slate-800"} ${p.score > 21 ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-3xl font-bold text-slate-500">
                        #{idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-xl flex items-center gap-2">
                          {p.username}
                          {p.isWinner && (
                            <span className="text-amber-500 text-2xl">🏆</span>
                          )}
                        </div>
                        <div className="text-slate-400 text-sm">
                          {p.score > 21 ? "💥 Busted" : "Valid hand"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="text-3xl font-mono font-bold text-white bg-slate-900 px-4 py-2 rounded-xl border border-slate-700 shadow-inner title-font">
                        {p.score}{" "}
                        <span className="text-sm text-slate-500 font-sans">
                          Pts
                        </span>
                      </div>
                      <div className="text-amber-500 font-bold text-sm bg-amber-500/10 px-3 py-1 rounded-lg">
                        🪙 {p.coins}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 text-center">
                <button
                  onClick={handleReady}
                  disabled={myPlayer?.isReady}
                  className={`px-10 py-4 rounded-xl text-xl font-bold transition-all shadow-lg ${
                    myPlayer?.isReady
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600"
                      : "bg-linear-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 active:scale-95 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  }`}
                >
                  {myPlayer?.isReady
                    ? "Đã sẵn sàng... Đợi người khác"
                    : "Chơi ván mới"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
