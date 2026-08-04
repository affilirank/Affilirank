#!/usr/bin/env python3
"""
Playwright screen recording for AffiliRank demo.
Records actual browser sessions with realistic user interactions.
"""
import asyncio
import time
from pathlib import Path
from playwright.async_api import async_playwright

RECORDING_DIR = Path("tmp/recordings")
RECORDING_DIR.mkdir(parents=True, exist_ok=True)

# Screen recording dimensions
WIDTH = 1280
HEIGHT = 720


async def smooth_scroll(page, distance, duration_ms=1000):
    """Smooth scroll like a real user."""
    steps = 20
    step_delay = duration_ms // steps
    step_dist = distance // steps
    for _ in range(steps):
        await page.mouse.wheel(0, step_dist)
        await page.wait_for_timeout(step_delay)


async def hover_element(page, selector, wait_ms=500):
    """Hover over element and wait."""
    try:
        el = page.locator(selector).first
        if await el.is_visible():
            await el.hover()
            await page.wait_for_timeout(wait_ms)
    except:
        pass


async def click_element(page, selector, wait_ms=1000):
    """Click element and wait for navigation."""
    try:
        el = page.locator(selector).first
        if await el.is_visible():
            await el.click()
            await page.wait_for_timeout(wait_ms)
    except:
        pass


async def record_scene(page, actions, duration_ms):
    """Execute actions and record for specified duration."""
    for action in actions:
        if action["type"] == "scroll":
            await smooth_scroll(page, action.get("distance", 300), action.get("duration", 800))
        elif action["type"] == "hover":
            await hover_element(page, action["selector"], action.get("wait", 500))
        elif action["type"] == "click":
            await click_element(page, action["selector"], action.get("wait", 1000))
        elif action["type"] == "wait":
            await page.wait_for_timeout(action.get("duration", 1000))
        elif action["type"] == "goto":
            await page.goto(action["url"], wait_until="networkidle")
            await page.wait_for_timeout(action.get("wait", 1000))
        elif action["type"] == "scroll_to":
            await page.evaluate(f"window.scrollTo(0, {action['y']})")
            await page.wait_for_timeout(action.get("wait", 500))

    remaining = duration_ms - sum(a.get("duration", 500) for a in actions)
    if remaining > 0:
        await page.wait_for_timeout(remaining)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-gpu"]
        )

        context = await browser.new_context(
            viewport={"width": WIDTH, "height": HEIGHT},
            record_video_dir=str(RECORDING_DIR),
            record_video_size={"width": WIDTH, "height": HEIGHT},
            device_scale_factor=1,
        )

        page = await context.new_page()

        # ─── SCENE 1: Homepage (0-8s) ─────────────────────────────────
        print("[1/9] Homepage...")
        await page.goto("https://affilirank.com", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Scroll down slowly to show the page
        await smooth_scroll(page, 400, 1500)
        await page.wait_for_timeout(1000)
        await smooth_scroll(page, 400, 1500)
        await page.wait_for_timeout(1000)
        await smooth_scroll(page, 400, 1500)
        await page.wait_for_timeout(1500)

        # ─── SCENE 2: Deal Stream (8-18s) ─────────────────────────────
        print("[2/9] Deal stream...")
        await page.goto("https://affilirank.com/deals", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        # Show deal cards
        await smooth_scroll(page, 300, 1000)
        await page.wait_for_timeout(1000)

        # Hover over a deal card to show interaction
        try:
            card = page.locator("[class*='deal-card'], [class*='DealCard'], article").first
            if await card.is_visible():
                await card.hover()
                await page.wait_for_timeout(1500)
        except:
            pass

        await smooth_scroll(page, 300, 1000)
        await page.wait_for_timeout(1500)

        # ─── SCENE 3: Click deal → modal (18-25s) ────────────────────
        print("[3/9] Deal modal...")
        try:
            deal_link = page.locator("a[href*='/deals/']").first
            if await deal_link.is_visible():
                await deal_link.click()
                await page.wait_for_timeout(2000)

                # Scroll inside modal
                await smooth_scroll(page, 200, 800)
                await page.wait_for_timeout(1500)
        except:
            pass

        # Go back
        await page.goto("https://affilirank.com/deals", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # ─── SCENE 4: Blog page (25-32s) ─────────────────────────────
        print("[4/9] Blog...")
        await page.goto("https://affilirank.com/blog", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        await smooth_scroll(page, 300, 1000)
        await page.wait_for_timeout(1000)
        await smooth_scroll(page, 300, 1000)
        await page.wait_for_timeout(1500)

        # ─── SCENE 5: Blog post (32-38s) ─────────────────────────────
        print("[5/9] Blog post...")
        try:
            post_link = page.locator("a[href*='/blog/']").first
            if await post_link.is_visible():
                await post_link.click()
                await page.wait_for_timeout(2000)

                await smooth_scroll(page, 400, 1200)
                await page.wait_for_timeout(1500)
        except:
            pass

        # ─── SCENE 6: Sales page (38-48s) ────────────────────────────
        print("[6/9] Sales page...")
        await page.goto("https://affilirank.com/affilirank", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        await smooth_scroll(page, 400, 1200)
        await page.wait_for_timeout(1000)
        await smooth_scroll(page, 400, 1200)
        await page.wait_for_timeout(1000)
        await smooth_scroll(page, 400, 1200)
        await page.wait_for_timeout(1500)

        # ─── SCENE 7: Funnel page (48-55s) ───────────────────────────
        print("[7/9] Funnel...")
        await page.goto("https://affilirank.com/funnel", wait_until="networkidle")
        await page.wait_for_timeout(1500)

        await smooth_scroll(page, 300, 1000)
        await page.wait_for_timeout(1000)
        await smooth_scroll(page, 300, 1000)
        await page.wait_for_timeout(1500)

        # ─── SCENE 8: Admin dashboard (55-62s) ───────────────────────
        print("[8/9] Admin...")
        await page.goto("https://affilirank.com/admin", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Enter password if needed
        try:
            pw_input = page.locator("input[type='password'], input[placeholder*='password'], input[name*='password']").first
            if await pw_input.is_visible():
                await pw_input.fill("FE3DoiGiKnB8ekJNkevxmaq")
                await page.wait_for_timeout(300)
                submit = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Enter')").first
                if await submit.is_visible():
                    await submit.click()
                    await page.wait_for_timeout(2000)
        except:
            pass

        await page.wait_for_timeout(1000)
        await smooth_scroll(page, 300, 1000)
        await page.wait_for_timeout(1500)

        # ─── SCENE 9: Back to homepage CTA (62-68s) ──────────────────
        print("[9/9] Final CTA...")
        await page.goto("https://affilirank.com", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        # Scroll to bottom for CTA
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(2000)

        # ─── CLOSE ────────────────────────────────────────────────────
        print("\nClosing recording...")
        await context.close()
        await browser.close()

        # Find the recording
        recordings = sorted(RECORDING_DIR.glob("*.webm"), key=lambda f: f.stat().st_mtime)
        if recordings:
            final = recordings[-1]
            out = Path("tmp/recordings/demo-recording.webm")
            out.unlink(missing_ok=True)
            final.rename(out)
            print(f"Recording: {out} ({out.stat().st_size / 1024 / 1024:.1f} MB)")
        else:
            print("No recording found!")


if __name__ == "__main__":
    asyncio.run(main())
