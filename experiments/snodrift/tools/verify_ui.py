import asyncio
import os
import subprocess
import time
from playwright.async_api import async_playwright

async def run_verification():
    # build the app first to ensure it works
    print("Building app...")
    subprocess.run("cd experiments/snodrift && npm run build", shell=True, check=True)

    # Start preview server in background
    print("Starting preview server...")
    server = subprocess.Popen(
        "cd experiments/snodrift && npm run preview -- --port 4173",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    # Wait for server
    time.sleep(5)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # iPhone 13 viewport
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()

        try:
            # 1. Verify Map (Home)
            print("Verifying Map View...")
            await page.goto("http://localhost:4173/")
            await page.wait_for_selector(".leaflet-container")
            # Wait for tiles to load a bit
            await page.wait_for_timeout(2000)
            await page.screenshot(path="experiments/snodrift/verify_map.png")
            print("Map screenshot saved.")

            # 2. Verify Schedule
            print("Verifying Schedule View...")
            await page.goto("http://localhost:4173/#/schedule")
            await page.wait_for_selector("text=Day 1")
            await page.screenshot(path="experiments/snodrift/verify_schedule.png")
            print("Schedule screenshot saved.")

            # 3. Verify Results (Logistics)
            print("Verifying Results View...")
            await page.goto("http://localhost:4173/#/results")
            await page.wait_for_timeout(1000)
            await page.screenshot(path="experiments/snodrift/verify_results.png")
            print("Results screenshot saved.")

        except Exception as e:
            print(f"Verification failed: {e}")
        finally:
            await browser.close()
            server.kill()

if __name__ == "__main__":
    asyncio.run(run_verification())
