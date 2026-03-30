import json
import os
import re
import traceback
from typing import Any

from playwright.sync_api import Route, expect, sync_playwright

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3000").rstrip("/")


def _json_response(route: Route, status: int, payload: dict[str, Any]) -> None:
    route.fulfill(
        status=status,
        body=json.dumps(payload),
        headers={"content-type": "application/json"},
    )


def _read_request_json(route: Route) -> dict[str, Any]:
    post_data = route.request.post_data
    raw_body = post_data() if callable(post_data) else post_data

    if not raw_body:
        return {}

    try:
        return json.loads(raw_body)
    except json.JSONDecodeError:
        return {}


def test_setup_page_select_database_redirects_to_home() -> None:
    selected_database_id: str | None = None

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        def handle_database_select(route: Route) -> None:
            nonlocal selected_database_id
            request_body = _read_request_json(route)
            selected_database_id = str(request_body.get("databaseId") or "").strip() or None
            _json_response(route, 200, {"success": True, "warnings": []})

        page.route("**/api/databases/select", handle_database_select)
        page.route(
            "**/api/databases",
            lambda route: _json_response(
                route,
                200,
                {
                    "databases": [
                        {
                            "id": "38befc4ff83547e2a94e9332e4a81aa5",
                            "title": "Paper DB",
                            "icon": None,
                            "description": "Test database",
                        }
                    ]
                },
            ),
        )

        page.goto(f"{BASE_URL}/setup")
        expect(page.get_by_role("heading", name="Notion データベースを選択")).to_be_visible()
        expect(page.get_by_text("Paper DB")).to_be_visible()

        page.get_by_role("button", name="このDBを使用").click()
        expect(page).to_have_url(re.compile(rf"{re.escape(BASE_URL)}/?$"))

        assert (
            selected_database_id == "38befc4ff83547e2a94e9332e4a81aa5"
        ), "Database selection request should include the clicked database ID"

        browser.close()


def test_search_and_save_to_notion_flow() -> None:
    calls = {
        "search": 0,
        "resolve": 0,
        "archive_get": 0,
        "archive_post": 0,
    }

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        def handle_archive(route: Route) -> None:
            method = route.request.method
            if method == "GET":
                calls["archive_get"] += 1
                _json_response(route, 200, {"records": []})
                return

            if method == "POST":
                calls["archive_post"] += 1
                _json_response(route, 200, {"success": True})
                return

            _json_response(route, 405, {"error": f"Unsupported method: {method}"})

        def handle_search(route: Route) -> None:
            calls["search"] += 1
            _json_response(
                route,
                200,
                {
                    "papers": [
                        {
                            "title": "An Example Paper",
                            "authors": [{"name": "Alice"}],
                            "year": 2024,
                            "venue": "ICSE",
                            "doi": "10.1000/example",
                            "citationCount": 12,
                        }
                    ],
                    "total": 1,
                },
            )

        def handle_resolve(route: Route) -> None:
            calls["resolve"] += 1
            _json_response(
                route,
                200,
                {
                    "paper": {
                        "paperId": "s2-example-id",
                        "title": "An Example Paper",
                        "authors": [{"name": "Alice"}],
                        "year": 2024,
                        "venue": "ICSE",
                        "externalIds": {"DOI": "10.1000/example"},
                    }
                },
            )

        page.route("**/api/archive", handle_archive)
        page.route("**/api/search?*", handle_search)
        page.route("**/api/resolve", handle_resolve)

        page.goto(f"{BASE_URL}/search")
        expect(page.get_by_role("heading", name="Search Papers")).to_be_visible()

        page.locator("#search-query").fill("mutation testing")
        page.get_by_role("button", name="Search").click()

        expect(page.get_by_text("An Example Paper")).to_be_visible()

        save_button = page.get_by_role("button", name="Save to Notion")
        expect(save_button).to_be_visible()
        save_button.click()

        expect(page.get_by_role("button", name="Saved")).to_be_visible()

        assert calls["search"] == 1, "Search API should be called exactly once"
        assert calls["archive_get"] >= 1, "Search page should prefetch archive state"
        assert calls["resolve"] == 1, "Resolve API should be called exactly once"
        assert calls["archive_post"] == 1, "Archive POST should be called once"

        browser.close()


def test_archive_page_redirects_to_login_on_unauthorized() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.route(
            "**/api/archive",
            lambda route: _json_response(route, 401, {"error": "Not authenticated"}),
        )

        page.goto(f"{BASE_URL}/archive")
        expect(page).to_have_url(re.compile(rf"{re.escape(BASE_URL)}/login$"))
        expect(page.get_by_role("heading", name="Paper Tools")).to_be_visible()

        browser.close()


def main() -> int:
    scenarios = [
        ("setup page database selection", test_setup_page_select_database_redirects_to_home),
        ("search page save to notion flow", test_search_and_save_to_notion_flow),
        ("archive page unauthorized redirect", test_archive_page_redirects_to_login_on_unauthorized),
    ]

    failures = 0

    for scenario_name, scenario in scenarios:
        print(f"[e2e] START: {scenario_name}")
        try:
            scenario()
            print(f"[e2e] PASS: {scenario_name}")
        except Exception as error:
            failures += 1
            print(f"[e2e] FAIL: {scenario_name}")
            print(f"[e2e] REASON: {error}")
            traceback.print_exc()

    if failures > 0:
        print(f"[e2e] Completed with {failures} failed scenario(s).")
        return 1

    print(f"[e2e] Completed successfully ({len(scenarios)} scenarios).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
