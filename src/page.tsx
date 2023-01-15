import React from "react";
import ReactDOM from "react-dom/client";
import { Bookmarks } from "./components/Bookmarks";

import "./tailwind.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <Bookmarks />
  </React.StrictMode>,
);
