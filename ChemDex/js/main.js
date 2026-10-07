import {
  allElements,
  elementsMap,
} from "./core.js";
import {
  renderPeriodicTable,
  nav,
  interlinkElement,
  showElementDetails,
  toggleSidebar,
  toggleLabMenu,
  toggleFilter,
  applyFilter,
  highlightCategory,
  removeHighlight,
  saveNote,
  simDragStart,
  simDragOver,
  simDrop,
  simDragLeave,
  showNoData,
  getCurrentElementFromUrl,
} from "./periodic.js";
import { mountChatbotWidget } from "./chatbot.js";

Object.assign(window, {
  nav,
  toggleSidebar,
  toggleLabMenu,
  toggleFilter,
  applyFilter,
  highlightCategory,
  removeHighlight,
  interlinkElement,
  saveNote,
  simDragStart,
  simDragOver,
  simDrop,
  simDragLeave,
  renderPeriodicTable,
  showNoData,
  showElementDetails,
});

renderPeriodicTable();
nav("view-periodic");
mountChatbotWidget();

const initialSymbol = getCurrentElementFromUrl();

if (initialSymbol && elementsMap.has(initialSymbol)) {
  interlinkElement(initialSymbol);
}
