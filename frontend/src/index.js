import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import setupKeplr from "./setupKeplr";
import getNewAccount from "./newAccount";
const CHAIN_ID = "secretdev-1";
const REST_URL = "http://localhost:1337";
const contractAddress = "secret18vd8fpwxzck93qlwghaj6arh4p7c5n8978vsyg";
// const contractAddress = "secret15gfn3tmx589z9l0h0n6mk0sunkn3864x2xt99d";

const App = () => {
  const [account, setAccount] = useState(null);
  const [signingClient, setSigningClient] = useState(null);
  const [board, setBoard] = useState([]);

  const queryBoard = async () => {
    try {
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
      console.log("idn");
      console.log("aaa", { result });
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

  console.log(board);

  return signingClient ? (
    <div>
      <p>Your account: {account?.address}</p>
      <div>
        <button onClick={() => queryBoard()}>Query board</button>
        <button onClick={() => join()}>Join</button>
        <button onClick={() => quess()}>Quess</button>
      </div>
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
