/* JDK Enterprises v22 — client security, App Check and diagnostics */
(function () {
  const Security = {
    environment: String(window.JDK_ENVIRONMENT || "development").toLowerCase(),
    appCheck: null,
    init() {
      if (!window.firebase || !window.JDKBackend?.app) return false;
      const siteKey = String(window.JDK_RECAPTCHA_ENTERPRISE_SITE_KEY || "");
      if (siteKey && !siteKey.startsWith("YOUR_") && firebase.appCheck) {
        try {
          this.appCheck = firebase.appCheck();
          this.appCheck.activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey), true);
        } catch (error) { console.warn("JDK App Check initialization:", error.message); }
      }
      window.addEventListener("error", event => this.report("window_error", event.error || event.message));
      window.addEventListener("unhandledrejection", event => this.report("unhandled_rejection", event.reason));
      return true;
    },
    async report(type, value) {
      const message = String(value?.message || value || "Unknown client error").slice(0, 500);
      if (!window.JDKBackend?.functions || message.includes("Firebase is not configured")) return;
      try { await window.JDKBackend.functions.httpsCallable("reportClientError")({ type, message, page: location.pathname.slice(0, 120) }); } catch (_) {}
    }
  };
  window.JDKSecurity = Security;
  window.addEventListener("DOMContentLoaded", () => setTimeout(() => Security.init(), 0));
})();
