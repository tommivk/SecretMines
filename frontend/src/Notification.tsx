import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";

type Props = {
  notificationData: { text: string; type: string };
  setShowNotification: React.Dispatch<React.SetStateAction<boolean>>;
};

const Notification = ({ notificationData, setShowNotification }: Props) => {
  return (
    <div
      className={`notification  ${
        notificationData.type === "success" ? "success" : ""
      }`}
      onClick={() => setShowNotification(false)}
    >
      <div className="notification-icon">
        <FontAwesomeIcon
          className="notification-icon"
          icon={faExclamationCircle}
        />
      </div>
      <div className="notification-text">{notificationData?.text}</div>
    </div>
  );
};

export default Notification;
