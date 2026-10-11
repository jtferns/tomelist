import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { JoinSyncBanner, resolvePairingLink } from "./components/JoinSyncBanner";
import { takePairingLink } from "./lib/pairing";
import { createAppRouter } from "./router";
import "./index.css";

// Before the router: its "/" redirect would drop the #sync= fragment.
const pendingJoin = resolvePairingLink(takePairingLink());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={createAppRouter()} />
    <JoinSyncBanner token={pendingJoin} />
  </StrictMode>
);
