import { memo } from "react";
import { motion } from "framer-motion";
import { Card } from "../types";

interface PlayingCardProps {
  card: Card;
  isLarge?: boolean;
}

const PlayingCard = memo(({ card, isLarge = false }: PlayingCardProps) => {
  const cardSize = isLarge ? "w-24 h-36 text-3xl" : "w-20 h-28 text-2xl";
  const suitSize = isLarge ? "text-4xl" : "text-3xl";

  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "hearts":
        return "♥️";
      case "diamonds":
        return "♦️";
      case "clubs":
        return "♣️";
      default:
        return "♠️";
    }
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0, y: -50, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className={`bg-white text-black p-3 border-2 border-slate-300 rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] flex flex-col justify-between items-center font-bold ${cardSize}`}
    >
      <div className="self-start leading-none">{card.rank}</div>
      <div
        className={`leading-none ${["hearts", "diamonds"].includes(card.suit) ? "text-red-600" : "text-slate-900"} ${suitSize}`}
      >
        {getSuitSymbol(card.suit)}
      </div>
      <div className="self-end rotate-180 leading-none">{card.rank}</div>
    </motion.div>
  );
});

PlayingCard.displayName = "PlayingCard";

export default PlayingCard;
