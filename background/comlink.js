chrome.runtime.onConnect.addListener((port) => {
  if (ComlinkExtension.isMessagePort(port)) return;
  Comlink.expose(bg, ComlinkExtension.createBackgroundEndpoint(port));
});
