import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import setupKeplr from "./setupKeplr";
import getNewAccount from "./newAccount";
import Game from "./Game";
import GameList from "./GameList";
import Notification from "./Notification";
import AccountDetails from "./AccountDetails";
import Footer from "./Footer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { generate } from "project-name-generator";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

const CHAIN_ID = "secretdev-1";
const REST_URL = "http://localhost:1337";
const CODE_ID = 1;
const SECRET_WS_URL = process.env.REACT_APP_WEBSOCKET_URL;

const App = () => {
  const [account, setAccount] = useState(null);
  const [signingClient, setSigningClient] = useState(null);
  const [allGames, setAllGames] = useState(null);
  const [gameData, setGameData] = useState(null);
  const [isCreateGameLoading, setIsCreateGameLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationData, setNotificationData] = useState({
    text: "",
    type: "",
  });

  let notificationRef = useRef(null);
  let navigate = useNavigate();

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

  const handleNewNotification = (text, type) => {
    if (notificationRef.current) {
      clearTimeout(notificationRef.current);
    }

    setNotificationData({ text, type });
    setShowNotification(true);

    const timeout = setTimeout(() => {
      setShowNotification(false);
    }, 8000);

    notificationRef.current = timeout;
  };

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
    if (isCreateGameLoading) return;
    let gameName = generate({ words: 2 }).spaced;
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
      handleNewNotification(`New game "${gameName}" created!`, "success");
      setIsCreateGameLoading(false);
    } catch (error) {
      console.log(error);
      setIsCreateGameLoading(false);
      if (
        error.message.toLowerCase().includes("contract account already exists")
      ) {
        return handleNewNotification(
          "A game with the same name already exists"
        );
      }
      handleNewNotification(error.message);
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
    setGameData(null);
    navigate("/");
  };

  if (!signingClient) {
    return (
      <>
        <div className="wallet-connect-container">
          <div className="keplr-connect" onClick={() => connectKeplr()}>
            Connect Keplr Wallet
          </div>
          <div className="temporary-connect" onClick={() => createAccount()}>
            Use Temporary Account
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div>
      {showNotification && (
        <Notification
          notificationData={notificationData}
          setShowNotification={setShowNotification}
        />
      )}
      <AccountDetails
        account={account}
        handleNewNotification={handleNewNotification}
      />

      <Routes>
        <Route
          path="/:gameAddress"
          element={
            <>
              <button
                className="show-all-games-button"
                onClick={() => backToMenu()}
              >
                Show all games
              </button>
              <Game
                gameData={gameData}
                account={account}
                signingClient={signingClient}
                SECRET_WS_URL={SECRET_WS_URL}
                handleNewNotification={handleNewNotification}
              />
            </>
          }
        ></Route>
        <Route
          path="/"
          element={
            <div>
              <div>
                <>
                  <div className="game-creation">
                    <button onClick={instantiate}>
                      {isCreateGameLoading ? (
                        <FontAwesomeIcon className="fa-spin" icon={faSpinner} />
                      ) : (
                        "Create New Game"
                      )}
                    </button>
                  </div>
                  <GameList allGames={allGames} setGameData={setGameData} />
                </>

                {!allGames && <p className="no-games-text">Loading games...</p>}
                {allGames && allGames?.length === 0 && (
                  <p className="no-games-text">No games created yet</p>
                )}
              </div>
              <Footer />
            </div>
          }
        ></Route>
      </Routes>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
  document.getElementById("root")
);
