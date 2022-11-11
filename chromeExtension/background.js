import { clientScript } from "./clientScript.js";
import { post } from "./post.js";
chrome.runtime.onMessage.addListener((request, _, response) => {
  console.log(request);
  post("importImages", [[{ type: "html", html: request.html }]]).then((ids) => {
    console.log(ids);
    response(ids);
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
