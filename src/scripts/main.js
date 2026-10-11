(() => {
  "use strict";

  const root = document.documentElement;
  const themeButton = document.querySelector(".theme-toggle");
  const navButton = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  const progress = document.querySelector(".reading-progress");
  const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
  const themeKey = "portfolio-theme";
  const languageKey = "portfolio-language";
  const isChinese = root.lang.toLowerCase() === "zh-cn";
  const themeChoices = ["system", "light", "dark"];

  // A compact contents menu for long case studies and research articles.
  const article = document.querySelector('.case-study, .research-paper');
  const headings = article ? [...article.querySelectorAll('section h2')].filter(h => !h.closest('figure')) : [];
  const radioNav = article?.querySelector('.radio-section-nav');
  headings.forEach((heading, index) => {
    if (heading.id) return;
    let id = `page-section-${index + 1}`;
    while (document.getElementById(id)) id += '-section';
    heading.id = id;
  });

  if (headings.length >= 3 && !radioNav && !article.querySelector('.page-contents')) {
    const contents = document.createElement('details');
    contents.className = 'page-contents';
    const summary = document.createElement('summary');
    summary.textContent = isChinese ? '本页目录' : 'On this page';
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', summary.textContent);
    headings.forEach((heading) => {
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = (heading.closest('.section-heading')?.querySelector('p')?.textContent || heading.textContent).trim();
      link.addEventListener('click', () => {
        contents.open = false;
        heading.tabIndex = -1;
        heading.focus({preventScroll: true});
      });
      nav.append(link);
    });
    contents.append(summary, nav);
    article.querySelector('header')?.after(contents);
  }

  if (headings.length >= 3 || radioNav) {
    headings.forEach((heading) => {
      const section = heading.closest('section');
      const target = radioNav && section.id ? section : heading;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'section-copy';
      button.textContent = isChinese ? '复制章节链接' : 'Copy section link';
      button.setAttribute('aria-label', `${button.textContent}: ${heading.textContent.trim()}`);
      const status = document.createElement('span');
      status.className = 'section-copy-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-atomic', 'true');
      let fallback;
      button.addEventListener('click', async () => {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = target.id;
        button.disabled = true;
        status.textContent = isChinese ? '正在复制…' : 'Copying…';
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
          await navigator.clipboard.writeText(url.href);
          if (fallback) fallback.hidden = true;
          status.textContent = isChinese ? '章节链接已复制。' : 'Section link copied.';
        } catch {
          if (!fallback) {
            fallback = document.createElement('label');
            fallback.className = 'section-copy-fallback';
            const label = document.createElement('span');
            label.textContent = isChinese ? '章节链接（可选择并复制）' : 'Section link (select and copy)';
            const input = document.createElement('input');
            input.type = 'text';
            input.readOnly = true;
            input.addEventListener('focus', () => input.select());
            input.addEventListener('click', () => input.select());
            fallback.append(label, input);
            status.after(fallback);
          }
          fallback.hidden = false;
          const input = fallback.querySelector('input');
          input.value = url.href;
          input.focus({ preventScroll: true });
          input.select();
          status.textContent = isChinese
            ? '无法自动复制。链接已选中，请按 Ctrl+C 或 ⌘C，或使用设备的复制功能。'
            : 'Automatic copying unavailable. Link selected; press Ctrl+C or ⌘C, or use your device’s copy action.';
        } finally {
          button.disabled = false;
        }
      });
      heading.after(button, status);
    });
  }

  function hashTarget(hash) {
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  }

  // Generated heading IDs do not exist until this script runs.
  const initialTarget = hashTarget(window.location.hash);
  if (initialTarget && article?.contains(initialTarget)) {
    window.requestAnimationFrame(() => initialTarget.scrollIntoView({ behavior: 'instant' }));
  }

  const searchInput = document.getElementById('search-query');
  if (searchInput && window.location.hash === '#search-query') searchInput.focus();
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || event.isComposing) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]')) return;
    if (document.querySelector('dialog[open]')) return;
    if (searchInput) {
      event.preventDefault();
      searchInput.focus();
      return;
    }
    const searchLink = [...document.querySelectorAll('.site-nav a[href]')].find((link) => /\/search\/(?:index\.html)?$/.test(new URL(link.href).pathname));
    if (!searchLink) return;
    event.preventDefault();
    const url = new URL(searchLink.href);
    url.hash = 'search-query';
    window.location.assign(url.href);
  });

  // Enlarge existing project figures without fetching additional media.
  let mediaViewer;
  let mediaTrigger;
  document.querySelectorAll('.case-study .figure > img, .commlab-figure > img, .netsage-screen > img, .flow-figure > img').forEach((img) => {
    if (img.closest('a, button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'media-zoom';
    button.dataset.zoomLabel = isChinese ? '查看大图 ↗' : 'Enlarge ↗';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', `${isChinese ? '放大图片' : 'Enlarge image'}: ${img.alt}`);
    img.replaceWith(button);
    button.append(img);
    button.addEventListener('click', () => {
      if (!mediaViewer) {
        mediaViewer = document.createElement('dialog');
        mediaViewer.className = 'media-viewer';
        mediaViewer.setAttribute('aria-labelledby', 'media-viewer-title');
        mediaViewer.innerHTML = `<div class="media-viewer-bar"><strong id="media-viewer-title">${isChinese ? '图片预览' : 'Image preview'}</strong><a class="media-original" target="_blank" rel="noopener">${isChinese ? '打开原图 ↗' : 'Open original ↗'}</a><button type="button" class="media-viewer-close" aria-label="${isChinese ? '关闭图片' : 'Close image'}">×</button></div><img alt=""><p></p>`;
        document.body.append(mediaViewer);
        mediaViewer.querySelector('button').addEventListener('click', () => mediaViewer.close());
        mediaViewer.addEventListener('click', (event) => {
          const rect = mediaViewer.getBoundingClientRect();
          if (event.target === mediaViewer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) mediaViewer.close();
        });
        mediaViewer.addEventListener('close', () => mediaTrigger?.focus({ preventScroll: true }));
      }
      mediaTrigger = button;
      const preview = mediaViewer.querySelector('img');
      preview.src = img.currentSrc || img.src;
      mediaViewer.querySelector('.media-original').href = preview.src;
      preview.alt = img.alt;
      mediaViewer.querySelector('p').textContent = img.closest('figure')?.querySelector('figcaption')?.textContent || img.alt;
      mediaViewer.showModal();
    });
  });

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
    const themeNames = isChinese
      ? { system: "跟随系统主题", light: "浅色主题", dark: "深色主题" }
      : { system: "System theme", light: "Light theme", dark: "Dark theme" };
    const text = themeNames[preference];

    themeButton.dataset.themeChoice = preference;
    themeButton.setAttribute("aria-label", isChinese ? `${text}。切换至${themeNames[next]}。` : `${text}. Activate ${next} theme.`);
    themeButton.setAttribute("title", isChinese ? `${text}（当前呈现为${effective === "dark" ? "深色" : "浅色"}）` : `${text} (${effective} appearance)`);
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

  document.querySelectorAll("[data-language-choice]").forEach((link) => {
    link.addEventListener("click", () => {
      const choice = link.dataset.languageChoice;
      if (choice === "en" || choice === "zh-CN") safeStorage.set(languageKey, choice);
      if (article && window.location.hash && hashTarget(window.location.hash)) {
        const url = new URL(link.href);
        url.hash = window.location.hash;
        link.href = url.href;
      }
    });
  });

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

    siteNav.addEventListener("focusout", () => {
      requestAnimationFrame(() => {
        if (!siteNav.contains(document.activeElement) && document.activeElement !== navButton) setNavOpen(false);
      });
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
    root.dataset.navReady = "true";
  }

  let progressFrame = 0;

  const main = document.getElementById('main');
  const backToTop = main ? document.createElement('button') : null;
  if (backToTop) {
    backToTop.type = 'button';
    backToTop.className = 'back-to-top';
    backToTop.textContent = isChinese ? '返回顶部 ↑' : 'Back to top ↑';
    backToTop.hidden = true;
    document.body.append(backToTop);
    backToTop.addEventListener('click', () => {
      const focusTarget = main.querySelector('h1') || main;
      focusTarget.tabIndex = -1;
      focusTarget.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  }

  let readingLinks = [];
  let readingTargets = [];

  function updateActiveSection() {
    if (!readingTargets.length) return;
    const readingLine = Math.min(200, window.innerHeight * 0.25);
    let active = readingTargets[0];
    for (const target of readingTargets) {
      if (target.getBoundingClientRect().top <= readingLine) active = target;
    }
    if (window.scrollY > 0 && window.scrollY + window.innerHeight >= root.scrollHeight - 2) {
      active = readingTargets[readingTargets.length - 1];
    }
    readingLinks.forEach(({ link, target }) => {
      const current = target === active;
      link.classList.toggle('is-active', current);
      if (current) link.setAttribute('aria-current', 'location');
      else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
    });
  }

  function updateReadingProgress() {
    progressFrame = 0;
    updateActiveSection();
    if (backToTop) {
      const hidden = window.scrollY < Math.max(600, window.innerHeight);
      if (hidden && document.activeElement === backToTop) {
        main.tabIndex = -1;
        main.focus({ preventScroll: true });
      }
      backToTop.hidden = hidden;
    }
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
    progress.setAttribute("aria-label", isChinese ? "阅读进度" : "Reading progress");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
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

  readingLinks = [...sectionLinks, ...document.querySelectorAll('.page-contents a[href], .radio-section-nav a[href]')]
    .map((link) => {
      const url = new URL(link.href, window.location.href);
      const target = url.origin === window.location.origin && normalizedPath(url.href) === currentPath ? hashTarget(url.hash) : null;
      return { link, target };
    })
    .filter(({ target }) => target);
  readingTargets = [...new Set(readingLinks.map(({ target }) => target))]
    .sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

  window.addEventListener('scroll', requestProgressUpdate, { passive: true });
  window.addEventListener('resize', requestProgressUpdate, { passive: true });
  window.addEventListener('hashchange', requestProgressUpdate);
  window.addEventListener('load', requestProgressUpdate);
  updateReadingProgress();
})();
