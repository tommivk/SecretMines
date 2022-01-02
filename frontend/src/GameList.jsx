import React from "react";
import { Link } from "react-router-dom";

const GameList = ({ allGames, setGameData }) => {
  if (!allGames) return null;
  return allGames.map((game, index) => (
    <Link
      to={`/${game.address}`}
      style={{ textDecoration: "none", color: "white" }}
    >
      <div
        className="game-info"
        key={game.address}
        onClick={() => setGameData(game)}
      >
        <div className="game-number"># {allGames.length - index}</div>
        <h2 className="game-name">{game?.label}</h2>
        <p className="game-address">{game?.address}</p>
      </div>
    </Link>
  ));
};

export default GameList;
