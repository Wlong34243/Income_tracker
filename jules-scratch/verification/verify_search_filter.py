from playwright.sync_api import sync_playwright, Page, expect

def verify_search_and_filter(page: Page):
    """
    This test verifies the search and filter functionality.
    """
    # 1. Navigate to the app.
    page.goto("http://localhost:8080/index.html")

    # 2. Wait for the main app to be visible, which indicates login is complete.
    expect(page.locator("#mainApp")).to_be_visible(timeout=10000)

    # 3. Wait for transactions to be loaded.
    expect(page.locator(".p-2.border-b")).to_have_count(5, timeout=10000)

    # 4. Search for "rent"
    search_input = page.get_by_label("Search")
    search_input.fill("rent")

    # 5. Assert that only one transaction is visible.
    expect(page.locator(".p-2.border-b")).to_have_count(1)
    page.screenshot(path="jules-scratch/verification/search-rent.png")

    # 6. Search for ">1000"
    search_input.fill(">1000")
    expect(page.locator(".p-2.border-b")).to_have_count(2)
    page.screenshot(path="jules-scratch/verification/search-over-1000.png")

    # 7. Filter by entity "Tech Business"
    search_input.fill("")
    entity_select = page.get_by_label("Entity")
    entity_select.select_option("Tech Business")
    expect(page.locator(".p-2.border-b")).to_have_count(2)
    page.screenshot(path="jules-scratch/verification/filter-tech-business.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_search_and_filter(page)
        browser.close()

if __name__ == "__main__":
    main()
