import json
import re
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4173"
PRODUCTION_BASE = "https://ruoquecheng-eng.github.io/portfolio-site/"
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
    ("engineerplus-demo", "/projects/high-speed-rail/demo/#overview"),
    ("research", "/research/"),
    ("connected-diagram", "/research/connected-diagram-expansions/"),
    ("critical-cubic", "/research/critical-cubic-crossover/"),
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
        images.nth(index).evaluate("img => img.decode()")
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

    if viewport_name in {"mobile", "desktop"} and name in {"home", "projects", "netsage", "battery", "high-speed-rail", "engineerplus-demo", "research", "connected-diagram", "critical-cubic", "hypergraph", "resume"}:
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
        if page.get_by_text("Two single-author manuscripts are under review. The hypergraph-tensor collaboration is submitted to Linear and Multilinear Algebra.", exact=True).count() != 1:
            issues.append("home research: synchronized status summary is missing")
        if page.get_by_text("A second manuscript on edge-local information in nonuniform hypergraph tensors is in preparation.", exact=True).count() != 0:
            issues.append("home research: stale Hypergraph in-preparation summary remains")
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

        robots_response = page.request.get(f"{BASE_URL}/robots.txt")
        expected_robots = (
            "User-agent: *\n"
            "Allow: /\n"
            f"Sitemap: {PRODUCTION_BASE}sitemap.xml\n"
        )
        if not robots_response.ok or robots_response.text() != expected_robots:
            issues.append("SEO: robots.txt is not the expected three-line production file")

        sitemap_response = page.request.get(f"{BASE_URL}/sitemap.xml")
        if not sitemap_response.ok or sitemap_response.text().count("<loc>") != len(ROUTES):
            issues.append("SEO: sitemap route count does not match browser QA route count")

        page.goto(f"{BASE_URL}/", wait_until="networkidle")
        og_url = page.locator('meta[property="og:image"]').get_attribute("content")
        if og_url != f"{PRODUCTION_BASE}assets/images/og-portfolio.png":
            issues.append("SEO: home page does not use the shared raster Open Graph image")
        if page.locator('meta[property="og:image:width"]').get_attribute("content") != "1200" or page.locator('meta[property="og:image:height"]').get_attribute("content") != "630":
            issues.append("SEO: home Open Graph image dimensions are missing or incorrect")
        og_page = desktop.new_page()
        og_response = og_page.goto(f"{BASE_URL}/assets/images/og-portfolio.png", wait_until="load")
        if og_response is None or not og_response.ok or "image/png" not in og_response.headers.get("content-type", ""):
            issues.append("SEO: shared Open Graph PNG did not load with image/png content type")
        else:
            dimensions = og_page.locator("img").evaluate("img => [img.naturalWidth, img.naturalHeight]")
            if dimensions != [1200, 630]:
                issues.append(f"SEO: shared Open Graph image dimensions are {dimensions}, expected [1200, 630]")
        og_page.close()

        for route, journal in [
            ("/research/connected-diagram-expansions/", "Advances in Mathematics"),
            ("/research/critical-cubic-crossover/", "Journal of the London Mathematical Society"),
        ]:
            page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
            if page.get_by_text("Under review", exact=True).count() < 1:
                issues.append(f"research record {route}: Under review status is missing")
            if page.get_by_text(journal, exact=True).count() != 1:
                issues.append(f"research record {route}: journal metadata is missing or duplicated")
            if page.locator('a[href$=".pdf"]').count() != 0:
                issues.append(f"research record {route}: manuscript PDF must not be public")
            if page.get_by_text("submission agreement restricts public sharing", exact=False).count() < 1:
                issues.append(f"research record {route}: agreement-limited access note is missing")

        hypergraph_manuscript_path = "/assets/documents/beyond-vertex-profiles-nonuniform-hypergraph-tensors.pdf"
        page.goto(f"{BASE_URL}/research/hypergraph-tensor/", wait_until="networkidle")
        hypergraph_links = page.locator(f'a[href$="{hypergraph_manuscript_path}"]')
        if hypergraph_links.count() < 2:
            issues.append("hypergraph manuscript: expected view and download links")
        if page.get_by_text("Wanzheng Ning — first and corresponding author · Qianzhi Ao — second author · Haoxuan Hu, Hongbo Zhu, Junjie Wang, and Guoyi Li — shared third authorship", exact=True).count() != 1:
            issues.append("hypergraph manuscript: author order or roles are missing")
        if page.get_by_text("Submitted to Linear and Multilinear Algebra", exact=True).count() != 1:
            issues.append("hypergraph manuscript: submitted LMA status is missing")
        hypergraph_preview = page.locator('img[src$="assets/images/hypergraph-manuscript-title-page.png"]')
        if hypergraph_preview.count() != 1:
            issues.append("hypergraph manuscript: title-page preview is missing")
        elif hypergraph_preview.evaluate("img => [img.naturalWidth, img.naturalHeight]") != [1241, 1754]:
            issues.append("hypergraph manuscript: title-page preview dimensions are incorrect")
        hypergraph_response = page.request.get(f"{BASE_URL}{hypergraph_manuscript_path}")
        if not hypergraph_response.ok:
            issues.append(f"hypergraph manuscript: HTTP {hypergraph_response.status}")
        elif "application/pdf" not in hypergraph_response.headers.get("content-type", ""):
            issues.append("hypergraph manuscript: response is not application/pdf")

        battery_paper_path = "/assets/documents/lithium-ion-battery-rul-cascade-utilization-modeling.pdf"
        page.goto(f"{BASE_URL}/projects/battery-rul/", wait_until="networkidle")
        if page.get_by_text("University-level Second Prize in the Mathematical Modeling Competition", exact=True).count() < 1:
            issues.append("battery modeling competition: university-level second prize is missing")
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
        netsage_icon_size = page.locator('.project-visual-netsage img').first.evaluate(
            "img => ({width: Math.round(img.getBoundingClientRect().width), height: Math.round(img.getBoundingClientRect().height)})"
        )
        observations.append({"projectsNetSageIconDesktop": netsage_icon_size})
        if netsage_icon_size["width"] > 224 or netsage_icon_size["height"] > 224:
            issues.append(f"projects: NetSage icon is oversized at {netsage_icon_size}")
        page.goto(f"{BASE_URL}/projects/netsage/", wait_until="networkidle")
        netsage_screens = page.locator('img[src*="netsage-app-"]')
        if netsage_screens.count() != 5:
            issues.append("NetSage: expected five verified Android screenshots")
        else:
            for index in range(netsage_screens.count()):
                netsage_screens.nth(index).scroll_into_view_if_needed()
                netsage_screens.nth(index).evaluate("img => img.decode()")
            dimensions = netsage_screens.evaluate_all("imgs => imgs.map(img => [img.naturalWidth, img.naturalHeight])")
            if any(size != [720, 1600] for size in dimensions):
                issues.append(f"NetSage: unexpected screenshot dimensions {dimensions}")
            desktop_columns = page.locator(".netsage-screen-grid").evaluate(
                "el => getComputedStyle(el).gridTemplateColumns.split(' ').length"
            )
            if desktop_columns != 3:
                issues.append(f"NetSage: expected three desktop screenshot columns, found {desktop_columns}")
        page.goto(f"{BASE_URL}/projects/", wait_until="networkidle")
        rail_link = page.get_by_role("link", name="View railway project")
        if rail_link.count() != 1:
            issues.append("high-speed rail: supporting-work card is missing its detail-page link")
        if page.get_by_text("No award", exact=False).count() != 0:
            issues.append("Scenic Guide: no-award disclaimer remains in public project copy")

        page.goto(f"{BASE_URL}/projects/high-speed-rail/", wait_until="networkidle")
        if page.get_by_text("Illustrative interface data", exact=True).count() != 0:
            issues.append("high-speed rail: repeated illustrative-data module captions remain")
        if page.get_by_text("Its purpose is to demonstrate information architecture and interaction, not to report operating results.", exact=False).count() != 1:
            issues.append("high-speed rail: consolidated EngineerPlus boundary is missing or duplicated")
        if page.get_by_text("Contribution boundary", exact=True).count() != 1:
            issues.append("high-speed rail: contribution boundary is missing or duplicated")
        engineerplus_images = page.locator('img[src*="engineerplus-"]')
        if engineerplus_images.count() != 5:
            issues.append("high-speed rail: expected one overview and four module captures")
        if page.get_by_text("Five-person course team", exact=True).count() < 1:
            issues.append("high-speed rail: team context is missing")
        if page.get_by_text("Independent design and implementation", exact=True).count() < 1:
            issues.append("high-speed rail: independent front-end role is missing")
        if page.get_by_role("link", name="Open interactive demo").count() != 1:
            issues.append("high-speed rail: primary interactive-demo action is missing")
        if page.locator('a[href*="/demo/#"]').count() != 8:
            issues.append("high-speed rail: expected image and text deep links for four demo modules")

        demo_requests = []
        page.on("request", lambda request: demo_requests.append(request.url))
        page.goto(f"{BASE_URL}/projects/high-speed-rail/demo/", wait_until="networkidle")
        page.keyboard.press("Tab")
        if page.locator(":focus").inner_text().strip() != "Skip to workspace":
            issues.append("EngineerPlus demo: first keyboard focus is not the skip link")
        page.goto(f"{BASE_URL}/projects/high-speed-rail/demo/#capital", wait_until="networkidle")
        if page.get_by_text("Interactive concept prototype", exact=True).count() != 1:
            issues.append("EngineerPlus demo: prototype boundary label is missing")
        if page.get_by_text("Illustrative data only", exact=True).count() != 1:
            issues.append("EngineerPlus demo: illustrative-data boundary label is missing")
        if page.locator('[data-module-link]').count() != 5 or not page.locator("#capital").is_visible():
            issues.append("EngineerPlus demo: #capital deep link did not select the capital module")
        page.locator('[data-module-link="risk"]').click()
        page.go_back(wait_until="networkidle")
        if not page.locator("#capital").is_visible():
            issues.append("EngineerPlus demo: browser back did not restore the capital hash module")
        page.go_forward(wait_until="networkidle")
        if not page.locator("#risk").is_visible():
            issues.append("EngineerPlus demo: browser forward did not restore the risk hash module")
        page.goto(f"{BASE_URL}/projects/high-speed-rail/demo/#capital", wait_until="networkidle")

        initial_investors = int(page.locator('[data-capital-investors]').inner_text())
        page.locator('[name="investor"]').fill("Browser QA Fund")
        page.locator('[name="amount"]').fill("75")
        page.locator('[name="type"]').select_option("green")
        page.get_by_role("button", name="Add to session model").click()
        if int(page.locator('[data-capital-investors]').inner_text()) != initial_investors + 1:
            issues.append("EngineerPlus demo: capital submission did not update the investor count")
        page.reload(wait_until="networkidle")
        if int(page.locator('[data-capital-investors]').inner_text()) != initial_investors + 1:
            issues.append("EngineerPlus demo: session state did not survive a same-tab refresh")
        fresh_tab = desktop.new_page()
        fresh_tab.goto(f"{BASE_URL}/projects/high-speed-rail/demo/#capital", wait_until="networkidle")
        if fresh_tab.locator('[data-capital-investors]').inner_text() != "24":
            issues.append("EngineerPlus demo: session state leaked into a separate tab")
        fresh_tab.close()

        page.goto(f"{BASE_URL}/projects/high-speed-rail/demo/#risk", wait_until="networkidle")
        page.locator('[name="guarantee"]').fill("100")
        page.locator('[name="climate"]').fill("5")
        if page.locator('[data-risk-coverage]').inner_text() != "50" or page.locator('[data-risk-state]').inner_text() != "Review required":
            issues.append("EngineerPlus demo: risk sliders did not update the simplified formula state")

        page.goto(f"{BASE_URL}/projects/high-speed-rail/demo/#compliance", wait_until="networkidle")
        page.locator('[name="projectId"]').fill("HSR-QA-001")
        page.get_by_role("button", name="Run simulated check").click()
        page.get_by_text("Simulated workflow complete for HSR-QA-001.", exact=False).wait_for(timeout=5000)
        if page.locator('.compliance-steps .is-complete').count() != 4:
            issues.append("EngineerPlus demo: compliance workflow did not finish all four deterministic steps")

        page.goto(f"{BASE_URL}/projects/high-speed-rail/demo/#impact", wait_until="networkidle")
        baseline = page.locator('[data-impact-carbon]').inner_text()
        page.locator('[data-impact-region]').select_option("vic")
        page.locator('[data-impact-scenario]').select_option("lightweight")
        if page.locator('[data-impact-carbon]').inner_text() == baseline:
            issues.append("EngineerPlus demo: impact filters did not update local example data")
        page.locator('[data-map-region="qld"]').press("Enter")
        if page.locator('[data-impact-region]').input_value() != "qld":
            issues.append("EngineerPlus demo: keyboard map selection did not update the region")

        page.get_by_role("button", name="Reset demo").click()
        if page.locator('[data-impact-region]').input_value() != "all":
            issues.append("EngineerPlus demo: reset did not restore the impact region")
        page.goto(f"{BASE_URL}/projects/high-speed-rail/demo/#capital", wait_until="networkidle")
        if page.locator('[data-capital-investors]').inner_text() != "24":
            issues.append("EngineerPlus demo: reset did not restore capital state")
        external_demo_requests = [url for url in demo_requests if not url.startswith(BASE_URL)]
        if external_demo_requests:
            issues.append(f"EngineerPlus demo: external requests detected {external_demo_requests}")

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
        pdfinfo = subprocess.run(["pdfinfo", str(resume_pdf)], check=True, capture_output=True, text=True).stdout
        pages_match = re.search(r"^Pages:\s+(\d+)$", pdfinfo, re.MULTILINE)
        resume_pages = int(pages_match.group(1)) if pages_match else 0
        observations.append({"printPdf": str(resume_pdf.relative_to(ROOT)), "resumePrintPages": resume_pages})
        if resume_pages != 1:
            issues.append(f"resume print: expected 1 A4 page, got {resume_pages}")
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
        page.goto(f"{BASE_URL}/projects/", wait_until="networkidle")
        mobile_icon_size = page.locator('.project-visual-netsage img').first.evaluate(
            "img => ({width: Math.round(img.getBoundingClientRect().width), height: Math.round(img.getBoundingClientRect().height)})"
        )
        observations.append({"projectsNetSageIconMobile": mobile_icon_size})
        if mobile_icon_size["width"] > 224 or mobile_icon_size["height"] > 224:
            issues.append(f"projects mobile: NetSage icon is oversized at {mobile_icon_size}")
        page.goto(f"{BASE_URL}/projects/netsage/", wait_until="networkidle")
        mobile_columns = page.locator(".netsage-screen-grid").evaluate(
            "el => getComputedStyle(el).gridTemplateColumns.split(' ').length"
        )
        if mobile_columns != 1:
            issues.append(f"NetSage mobile: expected one screenshot column, found {mobile_columns}")
        mobile.close()

        for scheme in ["light", "dark"]:
            scheme_context = browser.new_context(viewport=VIEWPORTS["desktop"], color_scheme=scheme)
            scheme_page = scheme_context.new_page()
            scheme_errors = []
            scheme_page.on("console", lambda message, errors=scheme_errors: errors.append(message.text) if message.type == "error" else None)
            scheme_page.goto(f"{BASE_URL}/", wait_until="networkidle")
            background = scheme_page.locator("body").evaluate("el => getComputedStyle(el).backgroundColor")
            observations.append({f"{scheme}ThemeBodyBackground": background})
            if scheme_errors:
                issues.append(f"{scheme} theme: console errors {scheme_errors}")
            scheme_context.close()

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
