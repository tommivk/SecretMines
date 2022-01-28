import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub } from "@fortawesome/free-brands-svg-icons";

const Footer = () => {
  return (
    <div className="footer">
      <a
        href="https://github.com/tommivk/secretmines"
        target="__blank"
        rel="noopener noreferrer"
      >
        <FontAwesomeIcon className="github-icon" icon={faGithub} />
      </a>
    </div>
  );
};

export default Footer;
