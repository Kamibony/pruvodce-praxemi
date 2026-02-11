from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173/")

            # Login
            print("Logging in...")
            page.fill("#code", "999999")
            page.click("button[type='submit']")

            # Wait for Dashboard
            print("Waiting for dashboard...")
            page.wait_for_selector("text=Ahoj, Aneta", timeout=10000)

            # Allow animations to settle
            time.sleep(2)

            # Take screenshot
            page.screenshot(path="verification_dashboard.png", full_page=True)
            print("Screenshot saved to verification_dashboard.png")

            # Check for goal
            content = page.content()
            if "/ 9 h" in content:
                print("SUCCESS: Goal is 9 hours")
            elif "/ 15 h" in content:
                print("FAILURE: Goal is 15 hours")
            else:
                print("FAILURE: Goal not found")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
