/**
 * DkDocShop Application Entry Point
 */
import "./styles/main.css";
import "./styles/components.css";
import "./styles/utilities.css";
import { bootstrap } from "./app/bootstrap.js";

// Launch application on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => bootstrap());
} else {
  bootstrap();
}
