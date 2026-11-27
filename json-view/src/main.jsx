import React from "react";
import { createRoot } from "react-dom/client";
import JsonView from "./JsonView";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <JsonView />
  </React.StrictMode>,
);
