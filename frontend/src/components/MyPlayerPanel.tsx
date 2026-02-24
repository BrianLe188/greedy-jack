import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerState, GameStatus, Card } from "../types";
import PlayingCard from "./PlayingCard";

interface MyPlayerPanelProps {
  myPlayer: PlayerState;
  privateState: { hand: Card[]; score: number; rpsChoice?: string } | null;
  gameState: { status: GameStatus };
  isPendingAction: boolean;
  actionLoading: boolean;
  handleAction: (type: string, payload?: unknown) => void;
}

const MyPlayerPanel = memo(
  ({
    myPlayer,
    privateState,
    gameState,
    isPendingAction,
    actionLoading,
    handleAction,
  }: MyPlayerPanelProps) => {
    return (
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
                {myPlayer.username} (You)
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <div className="text-amber-400 font-bold text-sm bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/30">
                    🪙 Coins: {myPlayer.coins}{" "}
                    <span className="text-slate-400 text-xs ml-1">
                      (Betted: {myPlayer.currentRoundBet})
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

            <div className="flex gap-[-20px] pb-2 min-h-35 items-end justify-center md:justify-start">
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
                    <PlayingCard card={card} isLarge />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 min-w-[320px] w-full md:w-auto shrink-0">
            {gameState?.status === "deciding" && !myPlayer.isStanding && (
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

            {gameState?.status === "bidding" && !myPlayer.isStanding && (
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

            {gameState?.status === "rps" && !myPlayer.isStanding && (
              <div className="flex flex-col items-center">
                <div className="flex gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl">
                  {(["rock", "paper", "scissors"] as const).map((choice) => (
                    <button
                      key={choice}
                      onClick={() => handleAction(choice)}
                      disabled={myPlayer.rpsChoice !== "pending"}
                      className={`text-4xl p-4 rounded-xl transition-all ${
                        privateState?.rpsChoice === choice
                          ? "scale-110 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)] z-10"
                          : myPlayer.rpsChoice === "pending"
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
                {myPlayer.rpsChoice !== "pending" && (
                  <div className="mt-3 text-amber-400 font-bold uppercase tracking-widest animate-pulse">
                    Đợi người khác...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  },
);

MyPlayerPanel.displayName = "MyPlayerPanel";

export default MyPlayerPanel;
