export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
}

export type PlayerState = {
  id: string; // socket id
  username: string;
  hand: Card[];
  score: number;
  isStanding: boolean;
  biddingAction: "pending" | "take" | "skip";
  rpsChoice: "pending" | "rock" | "paper" | "scissors";
  isReady: boolean;
};

export type GameStatus =
  | "waiting"
  | "dealing"
  | "deciding"
  | "bidding"
  | "rps"
  | "awarding"
  | "game_over";

export interface GameState {
  status: GameStatus;
  deck: Card[];
  publicCard: Card | null;
  players: PlayerState[];
  currentTurn: string | null;
  roundTimer: number | null;
  awardingInfo?: { winnerId: string } | null;
}

export const createDeck = (): Card[] => {
  const suits: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
  const ranks: Rank[] = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      let value = parseInt(rank);
      if (["J", "Q", "K"].includes(rank)) value = 10;
      if (rank === "A") value = 11; // Simplified: A is 11, handle 1 logic later if needed
      deck.push({ suit, rank, value });
    }
  }

  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export const calculateScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;
  for (const card of hand) {
    score += card.value;
    if (card.rank === "A") aces += 1;
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
};
