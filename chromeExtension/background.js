import { clientScript } from "./clientScript.js";
import { post } from "./post.js";

chrome.runtime.onMessage.addListener((request, _, response) => {
  console.log(request);
  post("importFiles", [[{ type: "html", html: request.html }]])
    .then((ids) => {
      console.log(ids);
      response(ids);
    })
    .catch((reason) => {
      response(undefined);
    });
  return true;
});
chrome.action.onClicked.addListener((tab) => {
  if (!tab.url.includes("chrome://")) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: clientScript,
    });
  }
});
