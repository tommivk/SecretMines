import React, { useEffect, useState } from "react";

const Game = ({ contractAddress, account, signingClient }) => {
  const [gameState, setGameState] = useState(null);
  const [gamePoll, setGamePoll] = useState(null);

  useEffect(() => {
    setGameState(null);
    clearInterval(gamePoll);

    setGamePoll(setInterval(queryGame, 1000));

    return () => {
      clearInterval(gamePoll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, contractAddress]);

  const requestRematch = () => {
    try {
      signingClient.execute(contractAddress, {
        rematch: {},
      });
    } catch (error) {
      console.log(error?.message);
    }
  };

  const quess = async (choice) => {
    try {
      const result = await signingClient?.execute(contractAddress, {
        quess: { index: Number(choice) },
      });
      console.log(result);
    } catch (error) {
      console.log(error?.message);
    }
  };

  const queryGame = async () => {
    if (!contractAddress) return;
    try {
      const response = await signingClient?.queryContractSmart(
        contractAddress,
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

  const join = async () => {
    try {
      const response = await signingClient?.execute(contractAddress, {
        join: {},
      });
      console.log("res", response);
    } catch (err) {
      console.log(err);
    }
  };

  const getStatusLabel = () => {
    const player = account?.address;

    if (gameState?.player_a === player && !gameState?.player_b) {
      return <p>Waiting for an opponent to join</p>;
    }
    if (!gameState?.player_a || !gameState.player_b) {
      return <p>Waiting for players</p>;
    }
    if (gameState?.game_over) {
      if (gameState?.player_a !== player && gameState?.player_b !== player) {
        return <p>Winner: {gameState?.winner}</p>;
      }
      if (gameState?.winner === player) {
        return <h2>You win!</h2>;
      }
      if (
        (gameState.winner !== player &&
          gameState.player_a === account.address) ||
        gameState.player_b === account.address
      ) {
        return <h2>You lose!</h2>;
      }
    }
    if (gameState?.turn === player) {
      return <p>It's your turn</p>;
    } else {
      return <p>Opponent's turn</p>;
    }
  };

  if (!contractAddress) return null;
  if (!gameState?.board) {
    return <p className="loading-game-text">Loading game...</p>;
  }

  const getRematchStatus = () => {
    const player = account?.address;
    if (
      (gameState.player_b === player && gameState.player_a_wants_rematch) ||
      (gameState.player_a === player && gameState.player_b_wants_rematch)
    ) {
      return (
        <div>
          <p>Your opponent requested a rematch</p>
          <button className="rematch-button" onClick={() => requestRematch()}>
            Rematch
          </button>
        </div>
      );
    }

    if (
      (gameState.player_a === player && gameState.player_a_wants_rematch) ||
      (gameState.player_b === player && gameState.player_b_wants_rematch)
    ) {
      return <p>Request for a rematch sent</p>;
    }

    if (
      (gameState.player_a === player && !gameState.player_a_wants_rematch) ||
      (gameState.player_b === player && !gameState.player_b_wants_rematch)
    ) {
      return (
        <button className="rematch-button" onClick={() => requestRematch()}>
          Rematch
        </button>
      );
    }
  };

  return (
    <div className="game-container">
      <h4>
        {gameState?.player_a ? gameState?.player_a : "Waiting for player"}
      </h4>
      <h3>VS</h3>
      <h4>
        {gameState?.player_b ? gameState?.player_b : "Waiting for player"}
      </h4>
      <div className="board">
        {gameState?.board?.map((value, index) => (
          <div
            key={index}
            className={`square ${value === 1 ? "green" : ""} ${
              value === 2 ? "red" : ""
            }`}
            onClick={() => quess(index)}
          ></div>
        ))}
      </div>
      <div>{getStatusLabel()}</div>
      {gameState?.game_over && <div>{getRematchStatus()}</div>}
      {!gameState?.player_b && gameState?.player_a !== account?.address && (
        <button className="join-button" onClick={() => join()}>
          Join Game
        </button>
      )}
    </div>
  );
};

export default Game;
