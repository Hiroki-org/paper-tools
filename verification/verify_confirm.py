import json
import base64
from playwright.sync_api import sync_playwright, expect

def base64url_encode(data):
    return base64.urlsafe_b64encode(json.dumps(data).encode()).decode().rstrip("=")

def test_setup_page_confirm_dialog():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()

        # Forge a cookie that passes middleware check
        payload = {"token": "dummy_token"}
        encoded_payload = base64url_encode(payload)
        cookie_value = f"{encoded_payload}.fake_signature"

        context.add_cookies([
            {
                "name": "pt_notion_access",
                "value": cookie_value,
                "domain": "localhost",
                "path": "/"
            }
        ])

        page = context.new_page()

        # Mock API responses
        page.route("**/api/databases", lambda route: route.fulfill(
            status=200,
            body=json.dumps({"databases": []}),
            headers={"content-type": "application/json"}
        ))

        # Verify Setup Page Header
        print("Navigating to /setup...")
        page.goto("http://localhost:3000/setup")

        # Find the re-authorization link
        reauth_link = page.get_by_text("再認可 (DB一覧更新)")
        expect(reauth_link).to_be_visible()

        # Setup dialog handler
        dialog_message = ""
        def handle_dialog(dialog):
            nonlocal dialog_message
            dialog_message = dialog.message
            print(f"Dialog detected: {dialog.message}")
            dialog.accept() # Click OK

        page.on("dialog", handle_dialog)

        # Click the link
        # Note: In a real scenario this navigates away. We just want to check the dialog appears.
        # We can intercept the navigation request to prevent actual redirection if needed,
        # but for this test, we just want to know if window.confirm was called.

        # Since clicking might navigate, we wrap it.
        # But window.confirm is synchronous in browser, playwright handles it via event.
        with page.expect_navigation(url="**/api/auth/notion"):
            reauth_link.click()

        assert "Notionの再認可を行います" in dialog_message
        print("Verification successful: Confirmation dialog appeared.")

        browser.close()

if __name__ == "__main__":
    test_setup_page_confirm_dialog()
