import { memo, useState, useEffect, useRef, Activity } from "react";
import { motion } from "framer-motion";
import { Socket } from "socket.io-client";
import { ChatMessage } from "../types";

interface ChatBoxProps {
  socket: Socket | null;
  messages: ChatMessage[];
  myPlayerId: string | undefined;
}

const ChatBox = memo(({ socket, messages, myPlayerId }: ChatBoxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (inputValue.trim() && socket) {
      socket.emit("chatMessage", inputValue);
      setInputValue("");
    }
  };

  return (
    <>
      {/* Toggle Button for Mobile / General Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-48 right-4 md:bottom-28 md:right-8 z-50 bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] transition-all active:scale-95"
      >
        <div className="relative">
          <span className="text-2xl">💬</span>
          {messages.length > 0 && !isOpen && (
            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border border-slate-900 animate-pulse">
              New
            </span>
          )}
        </div>
      </button>

      {/* Chat Box Panel */}
      <Activity mode={isOpen ? "visible" : "hidden"}>
        <motion.div
          initial={false}
          animate={{
            opacity: isOpen ? 1 : 0,
            scale: isOpen ? 1 : 0.9,
            y: isOpen ? 0 : 20,
          }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: isOpen ? "auto" : "none" }}
          className="fixed bottom-64 right-4 md:bottom-44 md:right-8 z-40 w-96 max-h-200 h-[50vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-amber-500 flex items-center gap-2">
              <span>💬</span> Room Chat
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <div className="text-slate-500 text-center text-sm italic my-auto">
                No messages yet. Say hi!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === myPlayerId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-slate-500 font-bold mb-1 px-1">
                      {isMe ? "You" : msg.senderName}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${
                        isMe
                          ? "bg-emerald-600 text-white rounded-tr-sm"
                          : "bg-slate-700 text-slate-200 rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-slate-800 border-t border-slate-700 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Aa..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              maxLength={100}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md"
            >
              ↑
            </button>
          </div>
        </motion.div>
      </Activity>
    </>
  );
});

ChatBox.displayName = "ChatBox";

export default ChatBox;
