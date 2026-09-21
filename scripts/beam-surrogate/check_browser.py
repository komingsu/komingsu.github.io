"""Exercise the built Astro/MDX article, not a standalone mock page."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect


def main(url, browser_path, output):
    output.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=browser_path, args=["--no-sandbox"])
        for name, viewport in [("desktop", dict(width=1440,height=1100)),
                               ("mobile", dict(width=390,height=844)),
                               ("narrow", dict(width=320,height=740))]:
            context = browser.new_context(viewport=viewport, ignore_https_errors=True,
                                          is_mobile=name != "desktop", has_touch=name != "desktop", color_scheme="light")
            page = context.new_page()
            errors, failed_local = [], []
            page.on("pageerror", lambda e:errors.append(str(e)))
            page.on("response", lambda r:failed_local.append(r.url) if r.status >= 400 and r.url.startswith(url.split('/posts/')[0]) else None)
            page.goto(url, wait_until="networkidle", timeout=60000)
            page.add_style_tag(content="html { scroll-behavior: auto !important; }")
            expect(page.locator("html")).to_have_attribute("data-theme", "light")
            root = page.locator("#beam-explorer")
            root.scroll_into_view_if_needed()
            expect(root.locator(".beam-live")).to_be_visible(timeout=15000)
            expect(root).to_have_attribute("data-selected-id", "1240")
            expect(root.locator('[data-value="truth"]')).to_have_text("0.4464 mm")
            root.locator('[data-select="best"]').click()
            expect(root).to_have_attribute("data-selected-id", "3660")
            expect(root.locator('[data-value="prediction"]')).to_have_text("0.1112 mm")
            expect(root.locator('[data-value="truth"]')).to_have_text("0.1116 mm")
            expect(root.locator(".beam-constraint")).to_have_attribute("data-feasible", "true")
            expect(root.locator("svg title")).to_contain_text("폭 10 mm, 높이 40 mm")
            root.locator('[data-select="wide"]').click()
            expect(root.locator('[data-value="truth"]')).to_have_text("1.7857 mm")
            # Native keyboard behavior, not synthetic slider state alone.
            width = root.locator("#beam-width")
            width.focus()
            width.press("Home")
            expect(root.locator("#beam-width-value")).to_have_text("10.0 mm")
            width.press("ArrowRight")
            expect(root.locator("#beam-width-value")).to_have_text("10.5 mm")
            page.locator("#beam-height").focus()
            page.locator("#beam-height").press("End")
            width.press("End")
            expect(root.locator(".beam-constraint")).to_have_attribute("data-feasible", "false")
            expect(root.locator('[data-value="mass"]')).to_have_text("2.1600 / 0.540 kg")
            # Pick the map center: (25,25), ID 30*61+30. Also validates CSS scaling.
            canvas = root.locator("canvas")
            canvas.scroll_into_view_if_needed()
            page.wait_for_function("() => { const y=scrollY; return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(scrollY === y)))); }")
            box=canvas.bounding_box()
            position=dict(x=223/420*box["width"], y=198/450*box["height"])
            if name == "desktop":
                canvas.click(position=position)
            else:
                canvas.tap(position=position)
            expect(root).to_have_attribute("data-selected-id", "1860")
            expect(root.locator("svg title")).to_contain_text("폭 25 mm, 높이 25 mm")
            root.locator('[data-select="best"]').click()
            assert root.evaluate("e => getComputedStyle(e).getPropertyValue('--series-1').trim()") == '#2a78d6'
            root.screenshot(path=str(output/f"{name}-light.png"))
            old_canvas = canvas.evaluate("e => e.toDataURL()")
            page.locator("#theme-toggle").click()
            expect(page.locator("html")).to_have_attribute("data-theme", "dark")
            page.wait_for_function("before => document.querySelector('.beam-map').toDataURL() !== before", arg=old_canvas)
            expect(root).to_have_attribute("data-selected-id", "3660")
            assert root.evaluate("e => getComputedStyle(e).getPropertyValue('--series-1').trim()") == '#3987e5'
            root.screenshot(path=str(output/f"{name}-dark.png"))
            assert root.evaluate("e => e.scrollWidth <= e.clientWidth + 1")
            assert page.evaluate("width => document.documentElement.scrollWidth <= width + 1", viewport["width"]), "page overflows horizontally"
            for img in page.locator('.prose img').all():
                if not img.is_visible():
                    continue
                img.scroll_into_view_if_needed()
                page.wait_for_function("e => e.complete && e.naturalWidth > 0", arg=img.element_handle())
            assert page.locator(".katex").count() > 0, "KaTeX did not render"
            assert page.locator(".katex-error").count() == 0
            assert "{beam." not in page.locator(".prose").inner_text()
            assert not failed_local, failed_local
            assert not errors, errors
            print(f"PASS {name}: map, buttons, keyboard, sliders, units, constraint, SVG, images, KaTeX, light/dark palette, no overflow/errors")
            context.close()
        # A data failure must retain useful static results and an explanation.
        context=browser.new_context(ignore_https_errors=True)
        page=context.new_page()
        page.route("**/explorer.json", lambda route:route.abort())
        page.goto(url, wait_until="networkidle")
        page.locator("#beam-explorer").scroll_into_view_if_needed()
        expect(page.locator(".beam-status")).to_contain_text("불러오지 못해", timeout=15000)
        expect(page.locator(".beam-fallback")).to_be_visible()
        expect(page.locator(".beam-live")).to_be_hidden()
        context.close()
        context=browser.new_context(java_script_enabled=False, ignore_https_errors=True)
        page=context.new_page()
        page.goto(url, wait_until="networkidle")
        fallback=page.locator(".beam-fallback img")
        fallback.scroll_into_view_if_needed()
        expect(fallback).to_be_visible()
        assert fallback.evaluate("e => e.naturalWidth > 0"), "no-JS fallback is not loaded"
        context.close()
        print("PASS: failed-data and no-JavaScript static fallbacks")
        # The shared header adjustment must keep both locale menus reachable.
        from urllib.parse import urlsplit
        parsed=urlsplit(url)
        origin=f"{parsed.scheme}://{parsed.netloc}"
        context=browser.new_context(viewport=dict(width=320,height=740), is_mobile=True, has_touch=True)
        page=context.new_page()
        for path in ("/", "/en/"):
            page.goto(origin+path, wait_until="networkidle")
            assert page.evaluate("document.documentElement.scrollWidth <= 321"), path
            expect(page.locator("#theme-toggle")).to_be_in_viewport()
            for link in page.locator(".site-nav__link").all():
                expect(link).to_be_in_viewport()
        context.close()
        print("PASS: Korean and English navigation on 320px screens")
        browser.close()


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:4321/posts/beam-surrogate-design-space/")
    parser.add_argument("--browser", default=None)
    parser.add_argument("--output", type=Path, default=Path("/tmp/beam-astro-browser"))
    args=parser.parse_args()
    main(args.url, args.browser, args.output)
