(() => {
  const root = document.documentElement;
  try {
    root.dataset.authHint =
      localStorage.getItem("pnd_auth_hint") === "signed-in"
        ? "signed-in"
        : "guest";
  } catch (_) {
    root.dataset.authHint = "guest";
  }
})();