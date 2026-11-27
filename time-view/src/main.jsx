import React from "react";
import { createRoot } from "react-dom/client";
import TimeView from "./TimeView";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <TimeView />
  </React.StrictMode>,
);
