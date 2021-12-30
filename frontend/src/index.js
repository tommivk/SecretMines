import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import setupKeplr from "./setupKeplr";
import getNewAccount from "./newAccount";
import Game from "./game";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

const CHAIN_ID = "secretdev-1";
const REST_URL = "http://localhost:1337";
const CODE_ID = 1;
const SECRET_WS_URL = "ws://localhost:26657/websocket";

const App = () => {
  const [account, setAccount] = useState(null);
  const [signingClient, setSigningClient] = useState(null);
  const [allGames, setAllGames] = useState(null);
  const [contractAddress, setContractAddress] = useState(null);
  const [gameName, setGameName] = useState("");
  const [isCreateGameLoading, setIsCreateGameLoading] = useState(false);

  useEffect(() => {
    const fetchAccount = async () => {
      const storageItem = localStorage.getItem("secretmines");
      const mnemonic = JSON.parse(storageItem);
      if (!account && mnemonic) {
        await getNewAccount(REST_URL, setSigningClient, setAccount, mnemonic);
      }
    };
    fetchAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      await getAllGames();
    };
    fetchGames();

    const webSocket = new WebSocket(SECRET_WS_URL);

    // listen for contract instatiations
    const query = `message.module='compute' AND message.action='instantiate'`;

    webSocket.onopen = () => {
      webSocket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "subscribe",
          params: {
            query,
          },
          id: "gameInstantiate", // jsonrpc id
        })
      );
    };
    webSocket.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      console.log(data);
      //update games list when new contract is instantiated
      if (data.id === "gameInstantiate") {
        await getAllGames();
      }
    };

    webSocket.onclose = () => {
      console.log("Websocket connection closed");
    };

    webSocket.onerror = (error) => {
      console.log(`[error] ${error.message}`);
    };

    return () => webSocket.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signingClient]);

  const getAllGames = async () => {
    console.log("getAllGames client:", signingClient);
    if (!signingClient) return;
    try {
      const response = await signingClient?.getContracts(CODE_ID);
      setAllGames(response.reverse());
    } catch (error) {
      console.log(error);
    }
  };

  const instantiate = async () => {
    try {
      setIsCreateGameLoading(true);
      const response = await signingClient.instantiate(
        CODE_ID,
        {
          CreateGame: {},
        },
        gameName
      );
      console.log(response);
      setGameName("");
      setIsCreateGameLoading(false);
    } catch (error) {
      console.log(error);
      setIsCreateGameLoading(false);
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
        Your address:{" "}
        <span className="account-address">{account?.address}</span>
        <FontAwesomeIcon
          className="copy-icon"
          icon={faCopy}
          onClick={() => navigator.clipboard.writeText(account?.address)}
        />
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
              <button onClick={instantiate}>
                {isCreateGameLoading ? (
                  <FontAwesomeIcon className="fa-spin" icon={faSpinner} />
                ) : (
                  "Create New Game"
                )}
              </button>
            </div>
            {allGames &&
              allGames.map((game, index) => (
                <div
                  className="game-info"
                  key={game.address}
                  onClick={() => setContractAddress(game?.address)}
                >
                  <div className="game-number"># {allGames.length - index}</div>
                  <h2 className="game-name">{game?.label}</h2>
                  <p className="game-address">{game?.address}</p>
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
        SECRET_WS_URL={SECRET_WS_URL}
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
