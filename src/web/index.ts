import { createElement } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

import { initializeI18n } from "@/renderer/i18n";
import "@/renderer/styles/panda.css";
import { applyStyle, defaultStyles } from "@/renderer/styles/styles";

applyStyle(defaultStyles.dark);

const container = document.querySelector("#app");
if (!(container instanceof HTMLElement)) {
  throw new Error('Could not find "#app" root element');
}

void initializeI18n().then(() => {
  createRoot(container).render(createElement(App));
});
