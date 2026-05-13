import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})
        await page.goto("http://localhost:8000/conceptual_flat_earth_model_audit/pipeline_visualizer.html")

        # Wait for data to load and initial draw
        await page.wait_for_timeout(2000)

        for step in range(8):
            # Evaluate JS to set the step.
            await page.evaluate(f"setStep({step})")

            # Wait for animation to finish. The animation duration is 720ms.
            await page.wait_for_timeout(1000)

            # Take screenshot
            filename = f"conceptual_flat_earth_model_audit/screenshot_step_{step}.png"
            await page.screenshot(path=filename)
            print(f"Saved {filename}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
