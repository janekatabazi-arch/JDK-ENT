/* JDK Enterprises v5 — shared storefront UI */
(function () {
  let toastTimer;
  function notify(message, type = "success") {
    let toast = document.getElementById("jdkToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "jdkToast";
      toast.className = "jdkToast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `jdkToast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    })[character]);
  }
  // Stable shared UI API. `toast` is retained as the canonical notification
  // entry point while `notify` remains backward-compatible with older pages.
  window.JDKUI = { notify, toast: notify, escapeHTML };

  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".footerTabs a").forEach(link => {
    const target = (link.getAttribute("href") || "").toLowerCase();
    link.classList.toggle("activeFooterLink", target === page);
  });

  function enhanceAccessibility() {
    const search = document.getElementById("getData");
    if (search && !search.getAttribute("aria-label")) search.setAttribute("aria-label", "Search JDK marketplace");
    const searchButton = document.getElementById("submitSearch");
    if (searchButton) {
      searchButton.setAttribute("role", "button");
      searchButton.setAttribute("tabindex", "0");
      searchButton.setAttribute("aria-label", "Search");
      searchButton.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); searchButton.click(); }
      });
    }
    const menu = document.getElementById("menu");
    if (menu) {
      menu.setAttribute("role", "button");
      menu.setAttribute("tabindex", "0");
      menu.setAttribute("aria-label", "Open navigation menu");
      menu.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); menu.click(); }
      });
    }
    document.querySelectorAll("img:not([loading])").forEach((image, index) => {
      if (index > 1) image.loading = "lazy";
      image.decoding = "async";
    });
    document.querySelectorAll("button").forEach(button => {
      if (!button.getAttribute("type") && button.closest("form")) button.type = "button";
    });
  }

  function syncMobileViewport() {
    document.documentElement.style.setProperty("--jdk-vh", `${window.innerHeight * 0.01}px`);
  }

  enhanceAccessibility();
  syncMobileViewport();
  window.addEventListener("resize", syncMobileViewport, { passive: true });

})();
