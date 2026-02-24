export type GameStatus =
  | "waiting"
  | "dealing"
  | "betting"
  | "deciding"
  | "bidding"
  | "rps"
  | "awarding"
  | "game_over";

export interface Card {
  suit: string;
  rank: string;
  value: number;
}

export interface PlayerState {
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

export interface GameState {
  status: GameStatus;
  publicCard: Card | null;
  players: PlayerState[];
  awardingInfo?: { winnerId: string } | null;
  pot: number;
  currentBet: number;
  bettingTurnId: string | null;
}

export interface GameOverResult {
  players: {
    id: string;
    username: string;
    hand: Card[];
    score: number;
    isWinner: boolean;
    coins: number;
  }[];
}

export interface RpsResult {
  choices: { id: string; username: string; choice: string }[];
  isTie: boolean;
  winnerId: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}
