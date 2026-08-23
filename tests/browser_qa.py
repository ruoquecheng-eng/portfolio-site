import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "qa-artifacts"
OUTPUT.mkdir(parents=True, exist_ok=True)
PDF_OUTPUT = ROOT / "output" / "pdf"
PDF_OUTPUT.mkdir(parents=True, exist_ok=True)
CHROME_CANDIDATES = [
    Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
    Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
]
CHROME = next((candidate for candidate in CHROME_CANDIDATES if candidate.exists()), None)

ROUTES = [
    ("home", "/"),
    ("projects", "/projects/"),
    ("netsage", "/projects/netsage/"),
    ("battery", "/projects/battery-rul/"),
    ("high-speed-rail", "/projects/high-speed-rail/"),
    ("research", "/research/"),
    ("jensen", "/research/jensen-polynomials/"),
    ("hypergraph", "/research/hypergraph-tensor/"),
    ("resume", "/resume/"),
]

VIEWPORTS = {
    "mobile": {"width": 360, "height": 800},
    "tablet": {"width": 768, "height": 900},
    "laptop": {"width": 1024, "height": 900},
    "desktop": {"width": 1440, "height": 1000},
}


def check_page(page, name, route, viewport_name, issues):
    console_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    response = page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
    if response is None or not response.ok:
        issues.append(f"{viewport_name}/{name}: HTTP load failed")
        return

    if not page.title().strip():
        issues.append(f"{viewport_name}/{name}: empty title")

    images = page.locator("img")
    for index in range(images.count()):
        images.nth(index).scroll_into_view_if_needed()
    page.wait_for_timeout(120)
    page.evaluate("window.scrollTo(0, 0)")

    overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth + 1")
    if overflow:
        issues.append(f"{viewport_name}/{name}: horizontal overflow")

    broken_images = page.locator("img").evaluate_all(
        "els => els.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.getAttribute('src'))"
    )
    if broken_images:
        issues.append(f"{viewport_name}/{name}: broken images {broken_images}")

    if console_errors:
        issues.append(f"{viewport_name}/{name}: console errors {console_errors}")

    if viewport_name in {"mobile", "desktop"} and name in {"home", "projects", "netsage", "battery", "high-speed-rail", "research", "jensen", "resume"}:
        page.screenshot(path=str(OUTPUT / f"{name}-{viewport_name}.png"), full_page=True)


def run():
    issues = []
    observations = []
    with sync_playwright() as p:
        launch_options = {"headless": True}
        if CHROME:
            launch_options["executable_path"] = str(CHROME)
        browser = p.chromium.launch(**launch_options)

        for viewport_name, viewport in VIEWPORTS.items():
            context = browser.new_context(viewport=viewport, reduced_motion="reduce" if viewport_name == "tablet" else "no-preference")
            page = context.new_page()
            for name, route in ROUTES:
                check_page(page, name, route, viewport_name, issues)
            context.close()

        desktop = browser.new_context(viewport=VIEWPORTS["desktop"])
        page = desktop.new_page()
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        page.keyboard.press("Tab")
        focused_text = page.locator(":focus").inner_text().strip()
        if focused_text != "Skip to content":
            issues.append(f"keyboard: first focus is {focused_text!r}, expected skip link")

        theme_button = page.locator(".theme-toggle")
        before_theme = page.locator("html").get_attribute("data-theme-preference")
        theme_button.click()
        after_theme = page.locator("html").get_attribute("data-theme-preference")
        if before_theme == after_theme:
            issues.append("theme: toggle did not change data-theme")

        manuscript_path = "/assets/documents/subcritical-hyperbolicity-jensen-polynomials-riemann-xi.pdf"
        page.goto(f"{BASE_URL}/research/jensen-polynomials/", wait_until="networkidle")
        manuscript_links = page.locator(f'a[href$="{manuscript_path}"]')
        if manuscript_links.count() < 2:
            issues.append("jensen manuscript: expected view and download links")
        manuscript_response = page.request.get(f"{BASE_URL}{manuscript_path}")
        if not manuscript_response.ok:
            issues.append(f"jensen manuscript: HTTP {manuscript_response.status}")
        elif "application/pdf" not in manuscript_response.headers.get("content-type", ""):
            issues.append("jensen manuscript: response is not application/pdf")

        battery_paper_path = "/assets/documents/lithium-ion-battery-rul-cascade-utilization-modeling.pdf"
        page.goto(f"{BASE_URL}/projects/battery-rul/", wait_until="networkidle")
        battery_paper_links = page.locator(f'a[href$="{battery_paper_path}"]')
        if battery_paper_links.count() < 3:
            issues.append("battery modeling paper: expected preview, view, and download links")
        if page.get_by_text("Full paper · Chinese · 169 pages", exact=True).count() != 1:
            issues.append("battery modeling paper: metadata is missing or duplicated")
        battery_paper_response = page.request.get(f"{BASE_URL}{battery_paper_path}")
        if not battery_paper_response.ok:
            issues.append(f"battery modeling paper: HTTP {battery_paper_response.status}")
        elif "application/pdf" not in battery_paper_response.headers.get("content-type", ""):
            issues.append("battery modeling paper: response is not application/pdf")

        page.goto(f"{BASE_URL}/projects/", wait_until="networkidle")
        rail_link = page.get_by_role("link", name="View railway project")
        if rail_link.count() != 1:
            issues.append("high-speed rail: supporting-work card is missing its detail-page link")

        page.goto(f"{BASE_URL}/projects/high-speed-rail/", wait_until="networkidle")
        if page.get_by_text("Illustrative interface data", exact=True).count() != 4:
            issues.append("high-speed rail: expected four illustrative-data module captions")
        if page.get_by_text("Contribution boundary", exact=True).count() != 1:
            issues.append("high-speed rail: contribution boundary is missing or duplicated")
        engineerplus_images = page.locator('img[src*="engineerplus-"]')
        if engineerplus_images.count() != 5:
            issues.append("high-speed rail: expected one overview and four module captures")
        if page.get_by_text("Five-person course team", exact=True).count() < 1:
            issues.append("high-speed rail: team context is missing")
        if page.get_by_text("Independent design and implementation", exact=True).count() < 1:
            issues.append("high-speed rail: independent front-end role is missing")

        page.goto(f"{BASE_URL}/resume/", wait_until="networkidle")
        page.emulate_media(media="print")
        header_display = page.locator(".site-header").evaluate("el => getComputedStyle(el).display")
        if header_display != "none":
            issues.append("print: site header is not hidden")
        resume_pdf = PDF_OUTPUT / "wanzheng-ning-resume.pdf"
        page.pdf(
            path=str(resume_pdf),
            format="A4",
            print_background=True,
            prefer_css_page_size=True,
        )
        observations.append({"printPdf": str(resume_pdf.relative_to(ROOT))})
        desktop.close()

        mobile = browser.new_context(viewport=VIEWPORTS["mobile"])
        page = mobile.new_page()
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        nav_button = page.get_by_role("button", name="Menu")
        nav_button.click()
        if nav_button.get_attribute("aria-expanded") != "true":
            issues.append("mobile nav: aria-expanded did not update")
        if not page.locator("#site-nav").is_visible():
            issues.append("mobile nav: navigation did not become visible")
        mobile.close()

        reduced = browser.new_context(viewport=VIEWPORTS["tablet"], reduced_motion="reduce")
        page = reduced.new_page()
        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        durations = page.locator(".hero-visual *").evaluate_all(
            "els => els.map(el => getComputedStyle(el).animationDuration).filter(Boolean)"
        )
        observations.append({"reducedMotionDurations": durations[:20]})
        reduced.close()

        browser.close()

    report = {
        "baseUrl": BASE_URL,
        "viewports": VIEWPORTS,
        "routes": [route for _, route in ROUTES],
        "issues": issues,
        "observations": observations,
        "screenshots": sorted(path.name for path in OUTPUT.glob("*.png")),
    }
    (OUTPUT / "browser-results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    raise SystemExit(1 if issues else 0)


if __name__ == "__main__":
    run()
