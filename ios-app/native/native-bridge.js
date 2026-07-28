(function setupNativeBridge() {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return;

  window.__JIJIANDAIBAN_NATIVE__ = true;
  document.documentElement.classList.add("native-app");

  const plugins = capacitor.Plugins || {};

  function forwardAuthUrl(url) {
    if (!url || !/^jijiandaiban:\/\/auth\/callback/i.test(url)) return;
    window.__JIJIANDAIBAN_PENDING_AUTH_URL__ = url;
    window.dispatchEvent(new CustomEvent("jijiandaiban:auth-url", {
      detail: { url }
    }));
  }

  plugins.App?.addListener?.("appUrlOpen", event => {
    forwardAuthUrl(event?.url);
  });

  plugins.App?.addListener?.("appStateChange", state => {
    window.dispatchEvent(new CustomEvent("jijiandaiban:app-state", {
      detail: { isActive: Boolean(state?.isActive) }
    }));
  });

  plugins.App?.getLaunchUrl?.().then(result => {
    forwardAuthUrl(result?.url);
  }).catch(() => {});

  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    plugins.Haptics?.impact?.({ style: "LIGHT" }).catch?.(() => {});
  }, { passive: true });

  document.addEventListener("DOMContentLoaded", () => {
    plugins.StatusBar?.setStyle?.({ style: "LIGHT" }).catch?.(() => {});
    plugins.StatusBar?.setBackgroundColor?.({ color: "#f8fafc" }).catch?.(() => {});
  }, { once: true });
})();
