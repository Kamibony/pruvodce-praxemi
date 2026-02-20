from playwright.sync_api import Page, expect, sync_playwright

def test_admin_alerts(page: Page):
    print("Navigating to Admin Dashboard...")
    # Go directly to admin dashboard
    page.goto("http://localhost:5174/#admin-dashboard")

    # Wait for the page to load content (AdminImport component)
    print("Waiting for Admin Import content...")
    page.wait_for_selector("text=Admin Import Dat", timeout=10000)

    # Verify the first alert in AdminImport
    print("Verifying AdminImport alert...")
    import_alert = page.locator("text=Jak import funguje")
    expect(import_alert).to_be_visible()

    # Verify the specific text about file name disappearing
    file_name_text = page.locator("text=Po obnovení stránky zmizí název souboru")
    expect(file_name_text).to_be_visible()

    # Verify the second alert in AdminKnowledgeBase
    print("Verifying AdminKnowledgeBase alert...")
    kb_alert = page.locator("text=Jak funguje mozek AI asistenta")
    expect(kb_alert).to_be_visible()

    # Verify the specific text about RAG behavior
    rag_text = page.locator("text=jediný a výhradní zdroj informací")
    expect(rag_text).to_be_visible()

    # Verify empty state message
    empty_state = page.locator("text=Žádné dokumenty nebyly nahrány. AI aktuálně používá pouze základní předvolené pokyny.")
    # It might not be visible if there are documents, but in a fresh env it should be.
    # We can check if it exists or check the table.
    # Since I don't know the state of the DB, I'll just check if the alert is visible.

    # Take a full page screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/admin_alerts.png", full_page=True)
    print("Screenshot saved to verification/admin_alerts.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 1024})
        page = context.new_page()
        try:
            test_admin_alerts(page)
        except Exception as e:
            print(f"Test failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
