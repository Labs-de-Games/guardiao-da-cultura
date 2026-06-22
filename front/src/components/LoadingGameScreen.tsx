"use client";

import { useEffect, useState } from "react";

export default function LoadingGameScreen() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : `${prev}.`));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100%",
        height: "100%",
        width: "100%",
        backgroundColor: "#000000",
        color: "#D9AD56",
        fontFamily: "Jockey One, sans-serif",
        fontSize: "48px",
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{ width: "250px", textAlign: "left" }}
        aria-live="polite"
        aria-busy="true"
      >
        Carregando{dots}
      </div>
    </div>
  );
}
