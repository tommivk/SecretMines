import React from "react";
import { Link } from "react-router-dom";
import { GameInfo } from "./types";

type Props = {
  allGames?: Array<GameInfo>;
};

const GameList = ({ allGames }: Props) => {
  if (!allGames) return null;
  return (
    <>
      {allGames.map((game, index) => (
        <div className="game-info-container" key={game.address}>
          <Link to={`/${game.address}`}>
            <div className="game-info">
              <div className="game-number"># {allGames.length - index}</div>
              <h2 className="game-name">{game?.label}</h2>
              <p className="game-address">{game?.address}</p>
            </div>
          </Link>
        </div>
      ))}
    </>
  );
};

export default GameList;
