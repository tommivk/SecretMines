import React, { FormEvent, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

type Props = {
  instantiate: (bet: string) => void;
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

  const handleInstantiate = (e: FormEvent) => {
    e.preventDefault();
    if (!bet) return;
    try {
      let amount = Number(bet) * 1000000; // 1 scrt = 1 million uscrt

      if (isNaN(amount)) {
        return handleNewNotification("Invalid amount", "error");
      }
      instantiate(amount.toString());
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
            <h2>Choose Bet</h2>
            <div className="modal-amount">
              <div className="modal-input">
                <input
                  className="modal-input-field"
                  placeholder="0"
                  value={bet}
                  onChange={({ target }) => setBet(target.value)}
                ></input>
                <span className="modal-denom">SCRT</span>
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
