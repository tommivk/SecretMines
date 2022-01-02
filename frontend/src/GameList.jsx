import React from "react";

const GameList = ({ allGames, setGameData }) => {
  if (!allGames) return null;
  return allGames.map((game, index) => (
    <div
      className="game-info"
      key={game.address}
      onClick={() => setGameData(game)}
    >
      <div className="game-number"># {allGames.length - index}</div>
      <h2 className="game-name">{game?.label}</h2>
      <p className="game-address">{game?.address}</p>
    </div>
  ));
};

export default GameList;
