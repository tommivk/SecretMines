import React, { useEffect, useState, useRef } from "react";
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
import * as generateName from "project-name-generator";
import { Routes, Route, useNavigate, useMatch } from "react-router-dom";
import { Account, CosmWasmClient, SigningCosmWasmClient } from "secretjs";
import { GameInfo } from "./types";

const CHAIN_ID = process.env.REACT_APP_CHAIN_ID;
const REST_URL = process.env.REACT_APP_REST_URL;
const CODE_ID = process.env.REACT_APP_CODE_ID;
const SECRET_WS_URL = process.env.REACT_APP_WEBSOCKET_URL;
const RPC_URL = process.env.REACT_APP_RPC_URL;

const App = () => {
  const [account, setAccount] = useState<Account>();
  const [signingClient, setSigningClient] = useState<SigningCosmWasmClient>();
  const [cosmWasmClient, setCosmWasmClient] = useState<CosmWasmClient>();
  const [accountFetched, setAccountFetched] = useState(false);
  const [allGames, setAllGames] = useState<Array<GameInfo>>();
  const [isCreateGameLoading, setIsCreateGameLoading] =
    useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationData, setNotificationData] = useState<{
    text: string;
    type: string;
  }>({
    text: "",
    type: "",
  });

  let notificationRef: React.MutableRefObject<NodeJS.Timeout | null> =
    useRef(null);
  let navigate = useNavigate();

  useEffect(() => {
    const fetchAccount = async () => {
      const storageItem = localStorage.getItem("secretmines");
      if (!account && storageItem) {
        const mnemonic = JSON.parse(storageItem);
        await getNewAccount(
          REST_URL,
          setSigningClient,
          setCosmWasmClient,
          setAccount,
          mnemonic
        );
      }
      setAccountFetched(true);
    };
    fetchAccount();
  }, [account]);

  useEffect(() => {
    const getAllGames = async () => {
      if (!signingClient) return;
      if (!CODE_ID) {
        return handleNewNotification("CODE_ID was undefined", "error");
      }
      try {
        const response = await signingClient.getContracts(Number(CODE_ID));
        const orderedGames = [...response].reverse();
        setAllGames(orderedGames);
      } catch (error) {
        console.log(error);
      }
    };

    getAllGames();

    if (!SECRET_WS_URL) {
      handleNewNotification("Websocket URL was undefined", "error");
      return;
    }
    const webSocket = new WebSocket(SECRET_WS_URL);

    // listen for contract instantiations
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

    webSocket.onerror = (error: ErrorEvent) => {
      console.log(`[error] ${error.message}`);
    };

    return () => webSocket.close();
  }, [signingClient]);

  const handleNewNotification = (text: string, type: string) => {
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

  const instantiate = async () => {
    if (isCreateGameLoading || !signingClient || !CODE_ID) return;
    let gameName = generateName({ words: 2 }).spaced;
    try {
      setIsCreateGameLoading(true);
      const response = await signingClient.instantiate(
        Number(CODE_ID),
        {
          CreateGame: {},
        },
        gameName
      );
      console.log(response);
      handleNewNotification(`New game "${gameName}" created!`, "success");
      setIsCreateGameLoading(false);
      await updateAccountBalance();
    } catch (error) {
      console.log(error);
      setIsCreateGameLoading(false);
      if (
        error.message.toLowerCase().includes("contract account already exists")
      ) {
        return handleNewNotification(
          "A game with the same name already exists",
          "error"
        );
      }
      handleNewNotification(error.message, "error");
    }
  };

  const connectKeplr = async () => {
    if (!CHAIN_ID || !REST_URL || !RPC_URL) return;
    await setupKeplr(
      CHAIN_ID,
      REST_URL,
      RPC_URL,
      setAccount,
      setSigningClient,
      setCosmWasmClient
    );
  };

  const createAccount = async () => {
    const mnemonic = localStorage.getItem("secretmines");
    let account = await getNewAccount(
      REST_URL,
      setSigningClient,
      setCosmWasmClient,
      setAccount,
      mnemonic
    );
    localStorage.setItem("secretmines", JSON.stringify(account.mnemonic));
  };

  const backToMenu = () => {
    navigate("/");
  };

  const updateAccountBalance = async () => {
    if (!cosmWasmClient || !account) return;
    try {
      const updatedAccount = await cosmWasmClient.getAccount(account.address);
      if (!updatedAccount) {
        return handleNewNotification(
          "Couldn't update account balance",
          "error"
        );
      }
      setAccount(updatedAccount);
    } catch (error) {
      handleNewNotification(error.message, "error");
    }
  };

  const gameMatch = useMatch("/:gameAddress");
  const gameData = gameMatch
    ? allGames?.find((game) => game.address === gameMatch.params.gameAddress)
    : undefined;

  if (!accountFetched) return null;
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
                cosmWasmClient={cosmWasmClient}
                SECRET_WS_URL={SECRET_WS_URL}
                handleNewNotification={handleNewNotification}
                updateAccountBalance={updateAccountBalance}
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
                  <GameList allGames={allGames} />
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

export default App;
