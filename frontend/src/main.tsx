import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth";
import App from "./App";
import "./styles/base.css";
import "./styles/auth.css";
import "./styles/navigation.css";
import "./styles/overview.css";
import "./styles/collections.css";
import "./styles/theme.css";
import "./styles/dialogs.css";
import "./styles/desktop.css";
import "./styles/tablet.css";
import "./styles/mobile.css";
import "./styles/compact.css";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
