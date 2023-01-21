import React from "react";
import ReactDOM from "react-dom/client";
import { NewTab } from "./components/NewTab";
import { createHashRouter, RouterProvider } from "react-router-dom";

import "./tailwind.css";

const router = createHashRouter([
  {
    path: "/newtab",
    element: <NewTab />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
