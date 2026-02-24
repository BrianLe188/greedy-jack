import { memo } from "react";
import { motion } from "framer-motion";

interface JoinScreenProps {
  username: string;
  setUsername: (name: string) => void;
  roomIdInput: string;
  setRoomIdInput: (id: string) => void;
  onJoin: (isCreate: boolean) => void;
}

const JoinScreen = memo(
  ({
    username,
    setUsername,
    roomIdInput,
    setRoomIdInput,
    onJoin,
  }: JoinScreenProps) => {
    return (
      <div className="min-h-screen bg-[#064E3B] bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-[#065f46] to-[#022c22] flex items-center justify-center p-4">
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
                onKeyDown={(e) => e.key === "Enter" && onJoin(false)}
              />
              <button
                onClick={() => onJoin(false)}
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
              onClick={() => onJoin(true)}
              className="w-full bg-amber-600 hover:bg-amber-500 active:scale-95 text-slate-900 font-bold py-4 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(217,119,6,0.39)]"
            >
              Create New Room
            </button>
          </div>
        </motion.div>
      </div>
    );
  },
);

JoinScreen.displayName = "JoinScreen";

export default JoinScreen;
