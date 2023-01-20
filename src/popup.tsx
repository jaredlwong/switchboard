import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { Search } from "./search/search";

// require('./tailwind.css');
import "./tailwind.css";

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <Search />
  </React.StrictMode>,
);
