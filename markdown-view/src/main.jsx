import React from "react";
import { createRoot } from "react-dom/client";
import MarkdownView from "./MarkdownView";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MarkdownView />
  </React.StrictMode>,
);
