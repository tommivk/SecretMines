import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { UserAccount } from "./types";

type Props = {
  account?: UserAccount;
  handleNewNotification: (text: string, type: string) => void;
};

const AccountDetails = ({ account, handleNewNotification }: Props) => {
  const getBalance = () => {
    if (
      account?.balance?.[0]?.amount &&
      Number(account.balance[0].amount) > 0
    ) {
      return <span>{Number(account.balance[0].amount) / 1000000} SCRT</span>;
    }
    return (
      <span>
        0 SCRT, Go get some funds from the{" "}
        <a
          className="faucet-link"
          href="https://faucet.secrettestnet.io/"
          target="__blank"
          rel="noopener noreferrer"
        >
          faucet
        </a>{" "}
        to get started
      </span>
    );
  };

  return (
    <div className="account-details">
      <p>
        Your address:{" "}
        <span className="account-address">{account?.address}</span>
      </p>
      <FontAwesomeIcon
        className="copy-icon"
        icon={faCopy}
        onClick={() => {
          account && navigator.clipboard.writeText(account?.address);
          handleNewNotification("Address copied!", "success");
        }}
      />
      <span className="account-balance">Balance: {getBalance()}</span>
    </div>
  );
};

export default AccountDetails;
