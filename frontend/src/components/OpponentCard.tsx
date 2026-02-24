import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayerState, GameStatus } from "../types";

interface OpponentCardProps {
  player: PlayerState;
  idx: number;
  gameStatus: GameStatus;
  bettingTurnId: string | null;
}

const OpponentCard = memo(
  ({ player: p, idx, gameStatus, bettingTurnId }: OpponentCardProps) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: idx * 0.1 }}
        className={`relative bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl flex flex-col items-center border shadow-xl ${p.isStanding ? "border-red-500/50 opacity-70" : "border-slate-600/50"}`}
      >
        <div className="absolute -top-4 bg-slate-700 px-3 py-1 rounded-full text-xs font-bold text-slate-300 shadow-md">
          {gameStatus === "betting" ? (
            p.id === bettingTurnId ? (
              <span className="text-amber-400 animate-pulse">Betting...</span>
            ) : (
              "Waiting"
            )
          ) : p.biddingAction !== "pending" && gameStatus !== "waiting" ? (
            "Decided 🟢"
          ) : (
            "Thinking ⏳"
          )}
        </div>
        <div className="mt-2 font-semibold text-amber-400">{p.username}</div>
        <div className="text-xs text-amber-500/80 font-bold mb-4 bg-amber-500/10 px-2 py-0.5 rounded-full">
          🪙 {p.coins} (Bet: {p.currentRoundBet})
        </div>

        <div className="flex justify-center min-h-20">
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
            <span className="text-slate-500 italic text-sm mt-4">No cards</span>
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
    );
  },
);

OpponentCard.displayName = "OpponentCard";

export default OpponentCard;
