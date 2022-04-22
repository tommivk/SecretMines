import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { CosmWasmClient, EnigmaUtils, SigningCosmWasmClient } from "secretjs";
import { GameInfo, GameState, UserAccount } from "./types";

type Props = {
  gameData?: GameInfo;
  account?: UserAccount;
  signingClient?: SigningCosmWasmClient;
  cosmWasmClient?: CosmWasmClient;
  SECRET_WS_URL?: string;
  handleNewNotification: (text: string, type: string) => void;
  updateAccountBalance: () => void;
};

const Game = ({
  gameData,
  account,
  signingClient,
  cosmWasmClient,
  SECRET_WS_URL,
  handleNewNotification,
  updateAccountBalance,
}: Props) => {
  const [gameState, setGameState] = useState<GameState>();
  const [activeSquare, setActiveSquare] = useState<number | null>(null);
  const [gradientAngle, setGradientAngle] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGradientAngle((prevAngle) =>
        prevAngle + 5 > 360 ? 0 : prevAngle + 5
      );
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const queryGame = async () => {
      if (!gameData?.address) return;
      try {
        const response = await cosmWasmClient?.queryContractSmart(
          gameData.address,
          {
            get_board: {},
          }
        );
        if (response?.board) {
          setGameState({ ...response });
        }
      } catch (error) {
        console.log(error?.message);
      }
    };

    queryGame();

    if (!SECRET_WS_URL) {
      handleNewNotification("Websocket URL was undefined", "error");
      return;
    }
    const webSocket = new WebSocket(SECRET_WS_URL);

    webSocket.onopen = function () {
      // listen for compute events with contract address
      let query = `message.module='compute' AND message.contract_address='${gameData?.address}'`;

      webSocket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "subscribe",
          params: {
            query,
          },
          id: "gameUpdate", // jsonrpc id
        })
      );
    };

    webSocket.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      //update game state
      if (data.id === "gameUpdate") {
        await queryGame();
      }
    };

    webSocket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    webSocket.onerror = (error: ErrorEvent) => {
      console.log(`WebSocket error: ${error.message}`);
    };

    return () => webSocket.close();
  }, [
    gameData,
    SECRET_WS_URL,
    signingClient,
    cosmWasmClient,
    handleNewNotification,
  ]);

  const requestRematch = async () => {
    if (!gameData?.address || !signingClient || !gameState) return;

    try {
      const bet = gameState.bet.toString();
      setIsLoading(true);
      await signingClient.execute(
        gameData?.address,
        {
          rematch: {},
        },
        undefined,
        [
          {
            amount: bet,
            denom: "uscrt",
          },
        ]
      );
    } catch (error) {
      handleNewNotification(error.message, "error");
    } finally {
      setIsLoading(false);
      updateAccountBalance();
    }
  };

  const withdraw = async () => {
    if (!gameData?.address) return;
    try {
      setIsLoading(true);
      await signingClient?.execute(gameData.address, {
        withdraw: {},
      });
    } catch (error) {
      handleNewNotification(error.message, "error");
    } finally {
      setIsLoading(false);
      updateAccountBalance();
    }
  };

  const quess = async (choice: number) => {
    if (!gameData?.address) return;

    try {
      setActiveSquare(choice);

      await signingClient?.execute(gameData.address, {
        quess: { index: Number(choice) },
      });
    } catch (error) {
      if (error.message.toLowerCase().includes("you're not a player")) {
        return handleNewNotification("You are not a player", "error");
      }

      if (error.message.toLowerCase().includes("not your turn")) {
        return handleNewNotification("It's not your turn", "error");
      }

      if (error.message.toLowerCase().includes("already quessed")) {
        return handleNewNotification(
          "The square has already been quessed",
          "error"
        );
      }

      if (error.message.toLowerCase().includes("game is over")) {
        return handleNewNotification("The game is over", "error");
      }

      if (!gameState?.player_b) {
        return handleNewNotification("The game is not started yet", "error");
      }

      handleNewNotification(error.message, "error");
    } finally {
      setActiveSquare(null);
      updateAccountBalance();
    }
  };

  const join = async () => {
    if (!gameData?.address || !gameState) return;
    try {
      const bet = gameState.bet.toString();
      const seed = EnigmaUtils.GenerateNewSeed();
      const secret = Buffer.from(seed.slice(0, 8)).readUInt32BE(0);
      setIsLoading(true);

      await signingClient?.execute(
        gameData.address,
        {
          join: { secret },
        },
        undefined,
        [
          {
            amount: bet,
            denom: "uscrt",
          },
        ]
      );
    } catch (error) {
      handleNewNotification(error.message, "error");
    } finally {
      setIsLoading(false);
      updateAccountBalance();
    }
  };

  const isPlayer = () => {
    if (
      gameState?.player_a === account?.address ||
      gameState?.player_b === account?.address
    ) {
      return true;
    }
    return false;
  };

  const isPlayerA = () => {
    if (gameState?.player_a === account?.address) {
      return true;
    }
    return false;
  };

  const isPlayerB = () => {
    if (gameState?.player_b === account?.address) {
      return true;
    }
    return false;
  };

  const getStatusLabel = () => {
    const player = account?.address;

    if (isPlayerA() && !gameState?.player_b) {
      return <p>Waiting for an opponent to join</p>;
    }
    if (!gameState?.player_a || !gameState.player_b) {
      return <p>Waiting for players</p>;
    }
    if (gameState?.game_over) {
      if (!isPlayer()) {
        return <p>Winner: {gameState?.winner}</p>;
      }
      if (gameState?.winner === player) {
        return <h2>You win!</h2>;
      }
      if (gameState.winner !== player && isPlayer()) {
        return <h2>You lose!</h2>;
      }
    }
    if (gameState?.turn === player) {
      return <p>It's your turn</p>;
    } else {
      return <p>Opponent's turn</p>;
    }
  };

  const getRematchStatus = () => {
    if (
      (isPlayerB() && gameState?.player_a_wants_rematch) ||
      (isPlayerA() && gameState?.player_b_wants_rematch)
    ) {
      return (
        <div>
          <p>Your opponent requested a rematch</p>
          <button className="rematch-button" onClick={() => requestRematch()}>
            {isLoading ? (
              <FontAwesomeIcon className="fa-spin" icon={faSpinner} />
            ) : (
              "Rematch"
            )}
          </button>
        </div>
      );
    }

    if (
      (isPlayerA() && gameState?.player_a_wants_rematch) ||
      (isPlayerB() && gameState?.player_b_wants_rematch)
    ) {
      return <p>Request for a rematch sent</p>;
    }

    if (
      (isPlayerA() && !gameState?.player_a_wants_rematch) ||
      (isPlayerB() && !gameState?.player_b_wants_rematch)
    ) {
      return (
        <button className="rematch-button" onClick={() => requestRematch()}>
          {isLoading ? (
            <FontAwesomeIcon className="fa-spin" icon={faSpinner} />
          ) : (
            "Rematch"
          )}
        </button>
      );
    }
    return <></>;
  };

  const withdrawRematchOfferVisible = () => {
    return (
      (isPlayerA() &&
        gameState?.player_a_wants_rematch &&
        !gameState?.player_b_wants_rematch) ||
      (isPlayerB() &&
        gameState?.player_b_wants_rematch &&
        !gameState?.player_a_wants_rematch)
    );
  };

  if (!gameData) return null;
  if (!gameState || !gameState.board) {
    return <p className="loading-game-text">Loading game...</p>;
  }

  return (
    <div className="game-container">
      <div className="game-title">
        <h1>{gameData.label}</h1>
      </div>
      <h4>{gameState.player_a ? gameState.player_a : "Waiting for player"}</h4>
      <h3>VS</h3>
      <h4>{gameState.player_b ? gameState.player_b : "Waiting for player"}</h4>
      <div className="board">
        {gameState.board.map((value, index) => (
          <div
            className={`gradient-border ${
              index === activeSquare ? "active" : ""
            }`}
            style={{
              background:
                index === activeSquare
                  ? `linear-gradient(${gradientAngle}deg,rgb(134 0 173) 50%, rgb(4 237 224) 98%)`
                  : "none",
            }}
            key={index}
          >
            <div
              className={`square ${value === 1 ? "green" : ""} ${
                value === 2 ? "red" : ""
              } ${index === activeSquare ? "active" : ""}`}
              onClick={() => quess(index)}
            ></div>
          </div>
        ))}
      </div>
      <div className="bet-amount">Bet: {gameState.bet / 1000000} SCRT</div>
      <div>{getStatusLabel()}</div>
      {gameState.game_over && <div>{getRematchStatus()}</div>}
      {!gameState.player_b && !isPlayerA() && (
        <button className="join-button" onClick={() => join()}>
          {isLoading ? (
            <FontAwesomeIcon className="fa-spin" icon={faSpinner} />
          ) : (
            "Join Game"
          )}
        </button>
      )}
      {!gameState.player_b && isPlayerA() && (
        <button onClick={withdraw} className="btn-dark">
          {isLoading ? (
            <FontAwesomeIcon className="fa-spin" icon={faSpinner} />
          ) : (
            "Leave"
          )}
        </button>
      )}
      {withdrawRematchOfferVisible() && (
        <button onClick={withdraw} className="btn-dark">
          {isLoading ? (
            <FontAwesomeIcon className="fa-spin" icon={faSpinner} />
          ) : (
            "Withdraw rematch request"
          )}
        </button>
      )}
    </div>
  );
};

export default Game;
