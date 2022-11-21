export function clientScript() {
  if (window["imagepetapeta-extension"] === true) {
    return;
  }
  window["imagepetapeta-extension"] = true;
  const footer = document.createElement("div");
  footer.style.position = "fixed";
  footer.style.width = "100%";
  footer.style.zIndex = "9999";
  footer.style.bottom = "0px";
  footer.style.color = "#ffffff";
  footer.style.padding = "16px";
  footer.style.backgroundColor = "rgba(0,0,0,0.5)";
  footer.innerHTML = "ImagePetaPeta Enabled";
  document.body.appendChild(footer);
  document.body.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (event.target.getAttribute("data-imagepetapeta-saved") === "true") {
      return;
    }
    chrome.runtime.sendMessage(
      {
        type: "save",
        html: event.target.outerHTML,
      },
      (error, res) => {
        if (error) {
          alert("タイムアウト");
          return;
        }
        if (res.length > 0) {
          event.target.setAttribute("data-imagepetapeta-saved", "true");
          event.target.style.filter = "invert(100%)";
        }
      },
    );
  });
}
