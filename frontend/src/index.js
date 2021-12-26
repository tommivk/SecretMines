import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import setupKeplr from "./setupKeplr";
import getNewAccount from "./newAccount";
import Game from "./game";

const CHAIN_ID = "secretdev-1";
const REST_URL = "http://localhost:1337";
const CODE_ID = 1;

const App = () => {
  const [account, setAccount] = useState(null);
  const [signingClient, setSigningClient] = useState(null);
  const [allGames, setAllGames] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [gameName, setGameName] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const storageItem = localStorage.getItem("secretmines");
      const mnemonic = JSON.parse(storageItem);
      if (!account && mnemonic) {
        await getNewAccount(REST_URL, setSigningClient, setAccount, mnemonic);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const allGamesPoll = setInterval(getAllGames, 1000);

    return () => {
      clearInterval(allGamesPoll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, contractAddress]);

  console.log(account);
  console.log(signingClient);

  const getAllGames = async () => {
    if (!account) return;
    try {
      const response = await signingClient?.getContracts(CODE_ID);
      setAllGames(response.reverse());
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
      setGameName("");
    } catch (error) {
      console.log(error);
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

  const backToMenu = () => {
    setContractAddress(null);
  };

  const getBalance = () => {
    if (
      account &&
      account.balance &&
      account.balance[0] &&
      account?.balance[0]?.amount &&
      account?.balance[0]?.amount > 0
    ) {
      return <span>{account.balance[0].amount / 1000000} SCRT</span>;
    }
    return (
      <span>
        0 SCRT, To get started, get some funds from the{" "}
        <a href="addressToFaucet">faucet</a>
      </span>
    );
  };

  if (!signingClient) {
    return (
      <div className="wallet-connect-container">
        <div className="keplr-connect" onClick={() => connectKeplr()}>
          Connect Keplr Wallet
        </div>
        <div className="temporary-connect" onClick={() => createAccount()}>
          Use Temporary Account
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="account-details">
        Your address: {account?.address}
        <span className="account-balance">Balance: {getBalance()}</span>
      </p>

      <div>
        {contractAddress && (
          <button
            className="show-all-games-button"
            onClick={() => backToMenu()}
          >
            Show all games
          </button>
        )}
      </div>
      <div>
        {!contractAddress && (
          <>
            <div className="game-creation">
              <input
                value={gameName}
                onChange={({ target }) => setGameName(target.value)}
                placeholder="game name"
              ></input>
              <button onClick={() => instantiate()}>Create new game</button>
            </div>
            {allGames &&
              allGames.map((game) => (
                <div className="game-info" key={game.address}>
                  <p>Name: {game?.label}</p>
                  <p>Address: {game?.address}</p>
                  <button onClick={() => setContractAddress(game?.address)}>
                    View
                  </button>
                </div>
              ))}
          </>
        )}
        {!allGames && <p className="no-games-text">Loading games...</p>}
        {allGames && allGames?.length === 0 && (
          <p className="no-games-text">No games created yet</p>
        )}
      </div>
      <Game
        contractAddress={contractAddress}
        account={account}
        signingClient={signingClient}
      />
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
