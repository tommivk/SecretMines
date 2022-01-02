import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy } from "@fortawesome/free-solid-svg-icons";

const AccountDetails = ({ account, handleNewNotification }) => {
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
          navigator.clipboard.writeText(account?.address);
          handleNewNotification("Address copied!", "success");
        }}
      />
      <span className="account-balance">Balance: {getBalance()}</span>
    </div>
  );
};

export default AccountDetails;
