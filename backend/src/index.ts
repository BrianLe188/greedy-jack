import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import {
  GameState,
  PlayerState,
  createDeck,
  calculateScore,
  Card,
} from "./models";

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let gameState: GameState = {
  status: "waiting",
  deck: [],
  publicCard: null,
  players: [],
  currentTurn: null,
  roundTimer: null,
  awardingInfo: null,
  pot: 0,
  currentBet: 0,
  bettingTurnId: null,
};

const MAX_PLAYERS = 4;

const resetGame = () => {
  gameState = {
    status: "waiting",
    deck: [],
    publicCard: null,
    players: [],
    currentTurn: null,
    roundTimer: null,
    awardingInfo: null,
    pot: 0,
    currentBet: 0,
    bettingTurnId: null,
  };
  sendStateUpdate();
};

const sendStateUpdate = () => {
  // Hide other players' cards, only send length
  const sanitizedPlayers = gameState.players.map((p) => ({
    id: p.id,
    username: p.username,
    handLength: p.hand.length,
    score: p.score > 0 ? (gameState.status === "game_over" ? p.score : "?") : 0,
    // only show actual score on game over or specific phase, wait we need to hide it if we want it hidden.
    // Actually user can only see their own score. Sent specifically below.
    isStanding: p.isStanding,
    biddingAction: p.biddingAction,
    rpsChoice: p.rpsChoice === "pending" ? "pending" : "decided", // hide choice until resolution
    isReady: p.isReady,
    coins: p.coins,
    currentRoundBet: p.currentRoundBet,
    hasActed: p.hasActed,
  }));

  const publicState = {
    status: gameState.status,
    publicCard: gameState.publicCard,
    awardingInfo: gameState.awardingInfo,
    players: sanitizedPlayers,
    pot: gameState.pot,
    currentBet: gameState.currentBet,
    bettingTurnId: gameState.bettingTurnId,
  };

  io.emit("stateUpdate", publicState);

  // Send private state to each player
  gameState.players.forEach((p) => {
    io.to(p.id).emit("privateState", {
      hand: p.hand,
      score: p.score,
      rpsChoice: p.rpsChoice,
    });
  });
};

const startBettingRound = () => {
  const activePlayers = gameState.players.filter((p) => !p.isStanding);
  if (activePlayers.length < 2) {
    gameState.status = "deciding";
    sendStateUpdate();
    return;
  }

  gameState.status = "betting";
  gameState.currentBet = 0;
  gameState.bettingTurnId = activePlayers[0].id;

  gameState.players.forEach((p) => {
    if (!p.isStanding) {
      p.currentRoundBet = 0;
      p.hasActed = false;
    }
  });

  sendStateUpdate();
};

const startGame = () => {
  const readyPlayers = gameState.players.filter((p) => p.isReady);
  // Need at least 2 players in the lobby to start
  if (
    gameState.players.length < 2 ||
    readyPlayers.length !== gameState.players.length
  )
    return;

  // Reset players state for the new round
  gameState.players.forEach((p) => {
    p.isStanding = p.coins <= 0;
    p.isReady = false; // reset ready for next game
  });

  const activePlayers = gameState.players.filter((p) => !p.isStanding);
  if (activePlayers.length < 2) {
    // End game immediately if less than 2 players have coins to play
    endGame();
    return;
  }

  gameState.status = "dealing";
  gameState.deck = createDeck();
  gameState.publicCard = null;
  gameState.awardingInfo = null;
  gameState.pot = 0;

  activePlayers.forEach((p) => {
    p.hand = [gameState.deck.pop()!, gameState.deck.pop()!];
    p.score = calculateScore(p.hand);
    p.biddingAction = "pending";
    p.rpsChoice = "pending";
  });

  // Start betting instead of deciding directly
  startBettingRound();
};

const checkAllDecided = () => {
  if (gameState.status !== "deciding") return;
  const allDecided = gameState.players.every(
    (p) => p.isStanding || p.biddingAction !== "pending",
  );
  if (allDecided) {
    // Reveal public card and move to bidding
    const activePlayers = gameState.players.filter((p) => !p.isStanding);
    if (activePlayers.length === 0) {
      endGame();
      return;
    }

    // Draw public card
    if (gameState.deck.length === 0) {
      endGame();
      return;
    }

    gameState.publicCard = gameState.deck.pop()!;

    if (activePlayers.length === 1) {
      // Auto-assign to the only remaining active player
      awardCard(activePlayers[0].id);
      return;
    }

    gameState.status = "bidding";

    activePlayers.forEach((p) => {
      p.biddingAction = "pending";
      p.rpsChoice = "pending";
    });

    sendStateUpdate();
  }
};

const resolveBidding = () => {
  if (gameState.status !== "bidding") return;
  const activePlayers = gameState.players.filter((p) => !p.isStanding);
  const allBid = activePlayers.every((p) => p.biddingAction !== "pending");

  if (allBid) {
    const takers = activePlayers.filter((p) => p.biddingAction === "take");

    if (takers.length === 1) {
      // Only one wants it
      awardCard(takers[0].id);
    } else if (takers.length > 1) {
      // Multiple want it -> RPS
      gameState.status = "rps";
      takers.forEach((p) => (p.rpsChoice = "pending"));
      // For others, set them to not participate in RPS
      activePlayers
        .filter((p) => p.biddingAction !== "take")
        .forEach((p) => (p.rpsChoice = "pending"));
      // but maybe track who is in RPS. Let's just say takers play it.
      sendStateUpdate();
    } else {
      // Nobody wants it -> RPS for Loser
      gameState.status = "rps";
      activePlayers.forEach((p) => (p.rpsChoice = "pending")); // Everyone plays RPS to find loser
      sendStateUpdate();
    }
  }
};

const resolveRPS = () => {
  if (gameState.status !== "rps") return;

  // Find players involved in RPS
  let participants: PlayerState[] = [];
  const takers = gameState.players.filter(
    (p) => !p.isStanding && p.biddingAction === "take",
  );
  if (takers.length > 1) {
    participants = takers;
  } else {
    participants = gameState.players.filter((p) => !p.isStanding);
  }

  const allPlayed = participants.every((p) => p.rpsChoice !== "pending");
  if (allPlayed) {
    const choices = new Set(participants.map((p) => p.rpsChoice));
    let isTie = choices.size === 3 || choices.size === 1;
    let winningChoice = "";
    let resultWinners: PlayerState[] = [];
    let resultLosers: PlayerState[] = [];

    if (!isTie) {
      const hasRock = choices.has("rock");
      const hasPaper = choices.has("paper");
      const hasScissors = choices.has("scissors");

      if (hasRock && hasScissors) winningChoice = "rock";
      if (hasScissors && hasPaper) winningChoice = "scissors";
      if (hasPaper && hasRock) winningChoice = "paper";

      if (takers.length > 1) {
        resultWinners = participants.filter(
          (p) => p.rpsChoice === winningChoice,
        );
        if (resultWinners.length > 1) isTie = true;
      } else {
        resultLosers = participants.filter(
          (p) => p.rpsChoice !== winningChoice,
        );
        if (resultLosers.length > 1) isTie = true;
      }
    }

    // Emit RPS result to show clients the choices
    io.emit("rpsResult", {
      choices: participants.map((p) => ({
        id: p.id,
        username: p.username,
        choice: p.rpsChoice,
      })),
      isTie,
      winnerId:
        !isTie && takers.length > 1
          ? resultWinners[0]?.id
          : !isTie
            ? resultLosers[0]?.id
            : null,
    });

    // Wait 3.5 seconds before applying result
    setTimeout(() => {
      if (isTie) {
        participants.forEach((p) => (p.rpsChoice = "pending"));
        sendStateUpdate();
      } else {
        if (takers.length > 1) {
          awardCard(resultWinners[0].id);
        } else {
          awardCard(resultLosers[0].id);
        }
      }
    }, 3500);
  }
};

const awardCard = (playerId: string) => {
  gameState.status = "awarding";
  gameState.awardingInfo = { winnerId: playerId };
  sendStateUpdate();

  setTimeout(() => {
    const player = gameState.players.find((p) => p.id === playerId);
    if (player && gameState.publicCard) {
      player.hand.push(gameState.publicCard);
      player.score = calculateScore(player.hand);

      if (player.hand.length >= 5 || player.score > 21) {
        player.isStanding = true;
      }
    }

    gameState.publicCard = null;
    gameState.awardingInfo = null;

    gameState.players.forEach((p) => {
      p.biddingAction = "pending";
      p.rpsChoice = "pending";
      if (p.hand.length >= 5 || p.score > 21 || p.coins <= 0) {
        p.isStanding = true; // Also force stand if out of coins
      }
    });

    if (gameState.players.every((p) => p.isStanding)) {
      endGame();
    } else {
      startBettingRound();
    }
  }, 2500);
};

const endGame = () => {
  gameState.status = "game_over";

  gameState.players.forEach((p) => {
    p.isReady = false;
  });

  let validPlayers = gameState.players.filter(
    (p) => p.score <= 21 && p.score > 0,
  );
  let bustedPlayers = gameState.players.filter((p) => p.score > 21);

  let bestScore = -1;
  let winners: PlayerState[] = [];

  if (validPlayers.length > 0) {
    bestScore = Math.max(...validPlayers.map((p) => p.score));
    winners = validPlayers.filter((p) => p.score === bestScore);
  } else if (bustedPlayers.length > 0) {
    bestScore = Math.min(...bustedPlayers.map((p) => p.score));
    winners = bustedPlayers.filter((p) => p.score === bestScore);
  }

  if (winners.length > 0 && gameState.pot > 0) {
    const winAmount = Math.floor(gameState.pot / winners.length);
    winners.forEach((w) => {
      w.coins += winAmount;
    });
    gameState.pot = 0;
  }

  const winnerIds = new Set(winners.map((w) => w.id));
  sendStateUpdate();

  const validScorePlayers = gameState.players
    .filter((p) => p.score <= 21 && p.score > 0)
    .sort((a, b) => b.score - a.score);
  const invalidScorePlayers = gameState.players
    .filter((p) => p.score > 21 || p.score === 0)
    .sort((a, b) => a.score - b.score);

  const sortedPlayers = [...validScorePlayers, ...invalidScorePlayers];

  io.emit("gameOver", {
    players: sortedPlayers.map((p) => ({
      id: p.id,
      username: p.username,
      hand: p.hand,
      score: p.score,
      isWinner: winnerIds.has(p.id),
      coins: p.coins,
    })),
  });
};

io.on("connection", (socket: Socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (username: string) => {
    if (
      gameState.players.length >= MAX_PLAYERS ||
      gameState.status !== "waiting"
    ) {
      socket.emit("error", "Game full or in progress");
      return;
    }
    gameState.players.push({
      id: socket.id,
      username: username || `Player ${gameState.players.length + 1}`,
      hand: [],
      score: 0,
      isStanding: false,
      biddingAction: "pending",
      rpsChoice: "pending",
      isReady: false,
      coins: 10000,
      currentRoundBet: 0,
      hasActed: false,
    });
    sendStateUpdate();
  });

  socket.on("ready", () => {
    const player = gameState.players.find((p) => p.id === socket.id);
    if (player) {
      player.isReady = true;
      sendStateUpdate();

      if (
        gameState.players.length >= 2 &&
        gameState.players.every((p) => p.isReady)
      ) {
        startGame();
      }
    }
  });

  socket.on("action", (data: { type: string; payload?: any }) => {
    const player = gameState.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (gameState.status === "betting") {
      if (gameState.bettingTurnId !== player.id) return;

      const activePlayers = gameState.players.filter((p) => !p.isStanding);

      if (data.type === "bet") {
        const amountToCall = gameState.currentBet - player.currentRoundBet;
        const betAmount = parseInt(data.payload?.amount || 0);

        // Forced to stand if can't even call the current bet
        if (player.coins < amountToCall) {
          player.isStanding = true;
        } else if (betAmount >= amountToCall && betAmount <= player.coins) {
          player.coins -= betAmount;
          player.currentRoundBet += betAmount;
          gameState.pot += betAmount;

          if (player.currentRoundBet > gameState.currentBet) {
            gameState.currentBet = player.currentRoundBet;
          }
          player.hasActed = true;
        }

        // Check if betting round ends
        const stillActive = gameState.players.filter((p) => !p.isStanding);
        const allActed = stillActive.every(
          (p) => p.hasActed && p.currentRoundBet === gameState.currentBet,
        );
        const onlyOneLeft = stillActive.length === 1;

        if (allActed || onlyOneLeft) {
          gameState.status = "deciding";
          gameState.bettingTurnId = null;
          if (onlyOneLeft && stillActive.length === 1) {
            // Give them back the uncalled diff if wanted, but simpler to just give pot later
          }
        } else {
          // Next player's turn
          let currentIndex = activePlayers.findIndex((p) => p.id === player.id);
          let nextPlayer = null;
          for (let i = 1; i <= activePlayers.length; i++) {
            const possibleNext =
              activePlayers[(currentIndex + i) % activePlayers.length];
            if (
              !possibleNext.isStanding &&
              (!possibleNext.hasActed ||
                possibleNext.currentRoundBet < gameState.currentBet)
            ) {
              nextPlayer = possibleNext;
              break;
            }
          }
          if (nextPlayer) {
            gameState.bettingTurnId = nextPlayer.id;
          } else {
            gameState.status = "deciding";
            gameState.bettingTurnId = null;
          }
        }
        sendStateUpdate();
      }
    } else if (gameState.status === "deciding") {
      if (data.type === "stand" && player.score >= 16) {
        player.isStanding = true;
        player.biddingAction = "skip";
      } else if (data.type === "continue") {
        player.biddingAction = "skip"; // temp marking as decided
      }
      checkAllDecided();
    } else if (gameState.status === "bidding") {
      if (data.type === "take") {
        player.biddingAction = "take";
      } else if (data.type === "skip") {
        player.biddingAction = "skip";
      }
      resolveBidding();
    } else if (gameState.status === "rps") {
      if (["rock", "paper", "scissors"].includes(data.type)) {
        player.rpsChoice = data.type as any;
        sendStateUpdate();
        resolveRPS();
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    gameState.players = gameState.players.filter((p) => p.id !== socket.id);
    // basic robust handling: if 0 players, reset
    if (gameState.players.length === 0) {
      resetGame();
    } else {
      sendStateUpdate();
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
