"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import {
  GameState,
  Card,
  GameOverResult,
  RpsResult,
  ChatMessage,
} from "../types";
import JoinScreen from "../components/JoinScreen";
import OpponentCard from "../components/OpponentCard";
import MyPlayerPanel from "../components/MyPlayerPanel";
import PlayingCard from "../components/PlayingCard";
import ChatBox from "../components/ChatBox";

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
  const [showRules, setShowRules] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSeenRules = localStorage.getItem("greedyJack_rulesSeen");
      if (!hasSeenRules) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowRules(true);
      }
    }
  }, []);

  useEffect(() => {
    const s = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001");
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    s.on("chatMessage", (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg].slice(-50)); // Keep last 50 messages
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const handleJoin = useCallback(
    (isCreate = false) => {
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
    },
    [socket, username, roomIdInput],
  );

  const handleReady = useCallback(() => socket?.emit("ready"), [socket]);

  const handleAction = useCallback(
    (type: string, payload?: unknown) => {
      setActionLoading(true);
      socket?.emit("action", { type, payload });
    },
    [socket],
  );

  const opponents = useMemo(() => {
    return gameState?.players.filter((p) => p.id !== socket?.id) || [];
  }, [gameState?.players, socket?.id]);

  const myPlayer = useMemo(() => {
    return gameState?.players.find((p) => p.id === socket?.id);
  }, [gameState?.players, socket?.id]);

  const isPendingAction =
    myPlayer?.biddingAction === "pending" || myPlayer?.rpsChoice === "pending";

  const dismissRules = useCallback(() => {
    localStorage.setItem("greedyJack_rulesSeen", "true");
    setShowRules(false);
  }, []);

  if (!isJoined) {
    return (
      <JoinScreen
        username={username}
        setUsername={setUsername}
        roomIdInput={roomIdInput}
        setRoomIdInput={setRoomIdInput}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#064E3B] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#065f46] to-[#022c22] text-white p-4 pb-48 font-sans overflow-x-hidden">
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
        {opponents.map((p, idx) => (
          <OpponentCard
            key={p.id}
            player={p}
            idx={idx}
            gameStatus={gameState?.status || "waiting"}
            bettingTurnId={gameState?.bettingTurnId || null}
          />
        ))}
      </div>

      {/* PUBLIC BOARD */}
      <div className="flex flex-col items-center justify-center  bg-emerald-800/40 backdrop-blur-md rounded-3xl mb-12 py-10 px-6 shadow-2xl border-2 border-emerald-600/50 w-full max-w-2xl mx-auto relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-emerald-500/10 to-transparent pointer-events-none" />

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
                  <PlayingCard card={gameState.publicCard} isLarge />
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
      {myPlayer && (
        <MyPlayerPanel
          myPlayer={myPlayer}
          privateState={privateState}
          gameState={gameState!}
          isPendingAction={isPendingAction}
          actionLoading={actionLoading}
          handleAction={handleAction}
        />
      )}

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
                    className={`p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 ${p.isWinner ? "bg-linear-to-r from-amber-600/20 to-transparent border border-amber-500" : "bg-slate-800"} ${p.score > 21 ? "opacity-60" : ""}`}
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

      {/* RULES MODAL */}
      <AnimatePresence>
        {showRules && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900 border border-emerald-500/50 p-8 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.2)] max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-emerald-400 mb-2">
                  Luật Chơi Greedy Jack
                </h2>
                <p className="text-slate-400">Đọc kỹ trước khi chơi nhé =))</p>
              </div>

              <div className="space-y-6 text-slate-300 text-lg leading-relaxed">
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-bold text-amber-500 mb-2">
                    1. Vòng chia bài & Đặt cược
                  </h3>
                  <p>
                    Mỗi người khởi đầu với 2 lá bài. Mỗi vòng người chơi sẽ bet
                    tiền (Call, Bet thêm tiền, hoặc nếu không đủ tiền bù sẽ phải
                    Dừng - Đứng bài).
                  </p>
                </div>

                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-bold text-amber-500 mb-2">
                    2. Lá bài dùng chung (Public Card)
                  </h3>
                  <p>
                    Sau khi cược, hệ thống rút 1 lá Public Card. Nếu bạn muốn
                    lấy, chọn **Húp**. Nếu bài đã đủ khỏe hoặc sợ quắc, chọn
                    **Nhường**.
                  </p>
                </div>

                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-bold text-amber-500 mb-2">
                    3. Tranh chấp & Oẳn tù tì (RPS)
                  </h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      Nếu chỉ 1 người Húp: Người đó nghiễm nhiên nhận lá bài.
                    </li>
                    <li>
                      Nếu nhiều người cùng đòi Húp: Phải chơi Oẳn Tù Tì. Người
                      thắng sẽ lấy bài.
                    </li>
                    <li>
                      Nếu không ai muốn Húp: Oẳn Tù Tì tìm ra kẻ thua cuộc phải
                      nhận lá bài xui xẻo này.
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <h3 className="text-xl font-bold text-amber-500 mb-2">
                    4. Phân thắng bại (Giống Xì dách)
                  </h3>
                  <p>
                    Quá 21 điểm (Busted) sẽ bị xử thua. Trò chơi kết thúc khi
                    tất cả dừng chơi hoặc quắc. Người có số điểm cao nhất (tối
                    đa 21) sẽ thắng toàn bộ Pot.
                  </p>
                </div>
              </div>

              <div className="mt-10 text-center">
                <button
                  onClick={dismissRules}
                  className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-10 py-4 rounded-xl text-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all"
                >
                  Đã Hiểu! Xin Mời Vào Bàn
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* CHAT BOX FLOATING PANEL */}
      {isJoined && (
        <ChatBox
          socket={socket}
          messages={chatMessages}
          myPlayerId={myPlayer?.id}
        />
      )}
    </div>
  );
}
