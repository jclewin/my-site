import React, { useState, FunctionComponent } from "react";
import styles from "../../styles/Home.module.css";

export const Jiggle: FunctionComponent = ({ children }) => {
  const [animated, setAnimated] = useState(false);

  return (
    <span
      onMouseEnter={() => setAnimated(() => true)}
      onAnimationEnd={() => setAnimated(() => false)}
    >
      <h1 className={`${styles.title} ${animated ? styles.titleAnimated : ""}`}>
        {children}
      </h1>
    </span>
  );
};
