import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import setupKeplr from "./setupKeplr";
import getNewAccount from "./newAccount";
const CHAIN_ID = "secretdev-1";
const REST_URL = "http://localhost:1337";
const CODE_ID = 1;

const App = () => {
  const [account, setAccount] = useState(null);
  const [signingClient, setSigningClient] = useState(null);
  const [board, setBoard] = useState([]);
  const [allGames, setAllGames] = useState([]);
  const [contractAddress, setContractAddress] = useState(null);
  const [gameName, setGameName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const storageItem = localStorage.getItem("secretmines");
      const mnemonic = JSON.parse(storageItem);
      if (!account && mnemonic) {
        await getNewAccount(REST_URL, setSigningClient, setAccount, mnemonic);
      }
      if (account) {
        await getAllGames();
        setTimeout(getAllGames, 0);
        setInterval(getAllGames, 3000);
      }
      if (contractAddress) {
        setTimeout(queryBoard, 0);
        setInterval(queryBoard, 3000);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, contractAddress]);

  const queryBoard = async () => {
    try {
      console.log("query board");
      const response = await signingClient?.queryContractSmart(
        contractAddress,
        {
          get_board: {},
        }
      );
      console.log(response);
      if (response?.board) {
        setBoard(response.board);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const getAllGames = async () => {
    try {
      const response = await signingClient?.getContracts(CODE_ID);
      console.log(response);
      setAllGames(response);
    } catch (error) {
      console.log(error);
    }
  };

  const instantiate = async () => {
    try {
      const response = await signingClient.instantiate(
        CODE_ID,
        {
          CreateGame: {},
        },
        gameName
      );
      console.log(response);
    } catch (error) {
      console.log(error);
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

  const connectKeplr = async () => {
    await setupKeplr(CHAIN_ID, setAccount, setSigningClient);
  };

  const createAccount = async () => {
    const mnemonic = localStorage.getItem("secretmines");
    let account = await getNewAccount(
      REST_URL,
      setSigningClient,
      setAccount,
      mnemonic
    );
    localStorage.setItem("secretmines", JSON.stringify(account.mnemonic));
  };

  return signingClient ? (
    <div>
      <p>Your account: {account?.address}</p>
      <div>
        <button onClick={() => getAllGames()}>Refresh games</button>
        <input
          onChange={({ target }) => setGameName(target.value)}
          placeholder="game name"
        ></input>
        <button onClick={() => instantiate()}>Create new game</button>
        <button onClick={() => queryBoard()}>Query board</button>
        <button onClick={() => join()}>Join</button>
        <button onClick={() => quess()}>Quess</button>
      </div>
      <div>
        All games
        {!contractAddress &&
          allGames.map((game) => (
            <div className="game-info" key={game.address}>
              <p>Name: {game?.label}</p>
              <p>Address: {game?.address}</p>
              <button onClick={() => setContractAddress(game?.address)}>
                Join
              </button>
            </div>
          ))}
      </div>
      {contractAddress && (
        <div className="board">
          {board?.map((value, index) => (
            <div
              key={index}
              className={`square ${value === 1 ? "green" : ""} ${
                value === 2 ? "red" : ""
              }`}
              onClick={() => quess(index)}
            >
              {index}
            </div>
          ))}
        </div>
      )}
    </div>
  ) : (
    <div>
      <button onClick={() => connectKeplr()}>Connect keplr wallet</button>
      <button onClick={() => createAccount()}>Create temporary account</button>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
