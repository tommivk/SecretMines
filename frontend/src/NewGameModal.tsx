import React, { FormEvent, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

type Props = {
  instantiate: (bet: string, timeout: Number) => void;
  handleNewNotification: (message: string, type: string) => void;
  setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isCreateGameLoading: boolean;
};

export const NewGameModal = ({
  instantiate,
  handleNewNotification,
  setModalOpen,
  isCreateGameLoading,
}: Props) => {
  const [bet, setBet] = useState<string>("");
  const [timeout, setTimeout] = useState<string>("120");

  const handleInstantiate = (e: FormEvent) => {
    e.preventDefault();

    if (!bet) {
      handleNewNotification("Bet is required", "error");
      return;
    }

    if (!timeout) {
      handleNewNotification("Timeout is required", "error");
      return;
    }

    try {
      let amount = Number(bet) * 1000000; // 1 scrt = 1 million uscrt
      let timeoutValue = Number(timeout);

      if (isNaN(amount)) {
        return handleNewNotification("Invalid amount", "error");
      }
      if (isNaN(timeoutValue)) {
        return handleNewNotification(
          "Timeout value must be a integer",
          "error"
        );
      }

      instantiate(amount.toString(), timeoutValue);
      setBet("");
    } catch (error) {
      handleNewNotification(error.message, "error");
    }
  };

  return (
    <div className="modal">
      <form onSubmit={handleInstantiate}>
        {isCreateGameLoading ? (
          <div className="modal-loading-icon-wrapper">
            <FontAwesomeIcon
              className="fa-spin modal-loading-icon"
              icon={faSpinner}
            />
          </div>
        ) : (
          <div className="modal-content">
            <h2>Create A New Game</h2>
            <div className="modal-amount">
              <div className="modal-input bet-field">
                <span className="input-prepend">Bet: </span>
                <input
                  className="modal-input-field"
                  placeholder="0"
                  value={bet}
                  onChange={({ target }) => setBet(target.value)}
                ></input>
                <span className="input-append">SCRT</span>
              </div>
              <div className="modal-input">
                <span className="input-prepend">Timeout:</span>
                <input
                  value={timeout}
                  className="modal-input-field timeout-field"
                  onChange={({ target }) => setTimeout(target.value)}
                ></input>
                <span className="input-append">Seconds</span>
              </div>
            </div>
            <div className="modal-buttons">
              <button
                onClick={() => setModalOpen(false)}
                type="button"
                className="btn-primary cancel-btn"
              >
                Cancel
              </button>
              <button className="btn-primary" type="submit">
                Create
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
