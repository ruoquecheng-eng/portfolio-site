(() => {
  "use strict";

  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const navButton = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  const progress = document.querySelector(".reading-progress");
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const themeKey = "portfolio-theme";
  const themeChoices = ["system", "light", "dark"];

  const safeStorage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Theme persistence is optional when storage is unavailable.
      }
    }
  };

  function resolvedTheme(preference) {
    return preference === "system"
      ? (colorScheme.matches ? "dark" : "light")
      : preference;
  }

  function updateThemeButton(preference) {
    if (!themeButton) return;

    const effective = resolvedTheme(preference);
    const next = themeChoices[(themeChoices.indexOf(preference) + 1) % themeChoices.length];
    const label = themeButton.querySelector("[data-theme-label]");
    const text = `${preference[0].toUpperCase()}${preference.slice(1)} theme`;

    themeButton.dataset.themeChoice = preference;
    themeButton.setAttribute("aria-label", `${text}. Activate ${next} theme.`);
    themeButton.setAttribute("title", `${text} (${effective} appearance)`);
    if (label) label.textContent = text;
  }

  function applyTheme(preference, persist = false) {
    const safePreference = themeChoices.includes(preference) ? preference : "system";
    root.dataset.themePreference = safePreference;
    root.dataset.theme = resolvedTheme(safePreference);
    updateThemeButton(safePreference);

    if (persist) safeStorage.set(themeKey, safePreference);
  }

  applyTheme(safeStorage.get(themeKey) || root.dataset.themePreference || "system");

  themeButton?.addEventListener("click", () => {
    const current = root.dataset.themePreference || "system";
    const next = themeChoices[(themeChoices.indexOf(current) + 1) % themeChoices.length];
    applyTheme(next, true);
  });

  const handleSystemThemeChange = () => {
    if ((root.dataset.themePreference || "system") === "system") {
      applyTheme("system");
    }
  };

  if (typeof colorScheme.addEventListener === "function") {
    colorScheme.addEventListener("change", handleSystemThemeChange);
  } else if (typeof colorScheme.addListener === "function") {
    colorScheme.addListener(handleSystemThemeChange);
  }

  function setNavOpen(open, returnFocus = false) {
    if (!navButton || !siteNav) return;

    navButton.setAttribute("aria-expanded", String(open));
    siteNav.classList.toggle("is-open", open);
    root.dataset.navOpen = String(open);

    if (!open && returnFocus) navButton.focus();
  }

  if (navButton && siteNav) {
    if (!navButton.hasAttribute("aria-expanded")) {
      navButton.setAttribute("aria-expanded", "false");
    }

    navButton.addEventListener("click", () => {
      setNavOpen(navButton.getAttribute("aria-expanded") !== "true");
    });

    siteNav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setNavOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (
        navButton.getAttribute("aria-expanded") === "true" &&
        !siteNav.contains(event.target) &&
        !navButton.contains(event.target)
      ) {
        setNavOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && navButton.getAttribute("aria-expanded") === "true") {
        setNavOpen(false, true);
      }
    });

    window.matchMedia("(min-width: 52.01rem)").addEventListener?.("change", (event) => {
      if (event.matches) setNavOpen(false);
    });
  }

  let progressFrame = 0;

  function updateReadingProgress() {
    progressFrame = 0;
    if (!progress) return;

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    progress.style.setProperty("--reading-progress", ratio.toFixed(4));
    progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
  }

  function requestProgressUpdate() {
    if (!progressFrame) progressFrame = window.requestAnimationFrame(updateReadingProgress);
  }

  if (progress) {
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Reading progress");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    window.addEventListener("scroll", requestProgressUpdate, { passive: true });
    window.addEventListener("resize", requestProgressUpdate, { passive: true });
    updateReadingProgress();
  }

  function normalizedPath(value) {
    const url = new URL(value, window.location.href);
    let path = url.pathname.replace(/index\.html$/, "").replace(/\/$/, "");
    return path || "/";
  }

  const navLinks = [...document.querySelectorAll(".site-nav a[href]")];
  const currentPath = normalizedPath(window.location.href);

  navLinks.forEach((link) => {
    const url = new URL(link.href, window.location.href);
    if (url.origin === window.location.origin && !url.hash && normalizedPath(url.href) === currentPath) {
      link.setAttribute("aria-current", "page");
    }
  });

  const sectionLinks = navLinks.filter((link) => {
    const url = new URL(link.href, window.location.href);
    return url.origin === window.location.origin && normalizedPath(url.href) === currentPath && url.hash;
  });

  if (sectionLinks.length && "IntersectionObserver" in window) {
    const linkById = new Map(
      sectionLinks.map((link) => [decodeURIComponent(new URL(link.href).hash.slice(1)), link])
    );
    const sections = [...linkById.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      sectionLinks.forEach((link) => {
        link.classList.remove("is-active");
        if (link.getAttribute("aria-current") === "location") link.removeAttribute("aria-current");
      });

      const active = linkById.get(visible.target.id);
      active?.classList.add("is-active");
      active?.setAttribute("aria-current", "location");
    }, {
      rootMargin: "-22% 0px -62% 0px",
      threshold: [0, 0.2, 0.6]
    });

    sections.forEach((section) => observer.observe(section));
  }
})();
