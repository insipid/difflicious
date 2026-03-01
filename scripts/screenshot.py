#!/usr/bin/env python3
"""
Generate docs/screenshots/light.png and docs/screenshots/dark.png.

The script spins up a temporary git repo containing a realistic staged diff,
starts a difflicious server pointed at that repo, takes screenshots in both
colour-scheme modes using a headless Chromium browser, then tears everything
down.

Prerequisites (one-time setup):
    uv add --dev playwright
    uv run playwright install chromium

Usage:
    uv run python scripts/screenshot.py
"""

import os
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from textwrap import dedent

# ---------------------------------------------------------------------------
# Output location
# ---------------------------------------------------------------------------

OUT_DIR = Path(__file__).resolve().parent.parent / "docs" / "screenshots"

# ---------------------------------------------------------------------------
# Fixture: two Python files, "before" committed, "after" staged
# This gives difflicious a realistic, syntax-highlighted diff to display.
# ---------------------------------------------------------------------------

FIXTURE: dict[str, dict[str, str]] = {
    "server.py": {
        "before": dedent("""\
            import re

            SECRET_PATTERN = re.compile(r'^[a-f0-9]{32}$')


            def validate_token(token):
                if not token:
                    return False
                return bool(SECRET_PATTERN.match(token))


            def get_user(db, user_id):
                result = db.execute("SELECT * FROM users WHERE id = ?", [user_id])
                return result.fetchone()


            def format_response(data, status='ok'):
                return {'status': status, 'data': data}
        """),
        "after": dedent("""\
            import re
            from typing import Any

            SECRET_PATTERN = re.compile(r'^[a-f0-9]{32}$')


            def validate_token(token: str | None) -> bool:
                \"\"\"Return True if *token* is a valid 32-character hex string.\"\"\"
                if not token:
                    return False
                return bool(SECRET_PATTERN.match(token))


            def get_user(db: Any, user_id: int) -> dict | None:
                \"\"\"Fetch a single user row by primary key.\"\"\"
                result = db.execute("SELECT * FROM users WHERE id = ?", [user_id])
                return result.fetchone()


            def format_response(data: Any, status: str = "ok") -> dict:
                \"\"\"Wrap *data* in the standard API envelope.\"\"\"
                return {"status": status, "data": data}


            def paginate(items: list, page: int = 1, per_page: int = 20) -> dict:
                \"\"\"Slice *items* into a page and return pagination metadata.\"\"\"
                start = (page - 1) * per_page
                return {
                    "items": items[start : start + per_page],
                    "page": page,
                    "per_page": per_page,
                    "total": len(items),
                }
        """),
    },
    "config.py": {
        "before": dedent("""\
            import os

            DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
            PORT = int(os.getenv('PORT', '8000'))
            HOST = os.getenv('HOST', '127.0.0.1')

            DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///app.db')

            ALLOWED_ORIGINS = ['http://localhost:3000']
        """),
        "after": dedent("""\
            import os
            from dataclasses import dataclass, field


            @dataclass(frozen=True)
            class Config:
                debug: bool = os.getenv("DEBUG", "false").lower() == "true"
                port: int = int(os.getenv("PORT", "8000"))
                host: str = os.getenv("HOST", "127.0.0.1")
                database_url: str = os.getenv("DATABASE_URL", "sqlite:///app.db")
                allowed_origins: list[str] = field(
                    default_factory=lambda: os.getenv(
                        "ALLOWED_ORIGINS", "http://localhost:3000"
                    ).split(",")
                )


            config = Config()
        """),
    },
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PORT = 5099
URL = f"http://127.0.0.1:{PORT}"


def _run(args: list[str], cwd: Path) -> None:
    subprocess.run(args, cwd=cwd, check=True, capture_output=True)


def make_fixture_repo(tmp: Path) -> Path:
    """Create a git repo with staged changes and return its path."""
    repo = tmp / "demo-repo"
    repo.mkdir()

    _run(["git", "init"], repo)
    _run(["git", "config", "user.email", "demo@example.com"], repo)
    _run(["git", "config", "user.name", "Demo"], repo)

    # Commit the "before" state
    for name, content in FIXTURE.items():
        (repo / name).write_text(content["before"])
    _run(["git", "add", "."], repo)
    _run(["git", "commit", "-m", "Initial commit"], repo)

    # Stage the "after" state (don't commit — difflicious shows staged diff)
    for name, content in FIXTURE.items():
        (repo / name).write_text(content["after"])
    _run(["git", "add", "."], repo)

    return repo


def wait_for_server(url: str, timeout: float = 15.0) -> None:
    """Poll until the server responds or *timeout* seconds elapse."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            urllib.request.urlopen(url, timeout=1)
            return
        except Exception:
            time.sleep(0.25)
    raise RuntimeError(f"Server at {url} did not respond within {timeout}s")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    try:
        from playwright.sync_api import sync_playwright  # noqa: PLC0415
    except ImportError:
        raise SystemExit(
            "Playwright is not installed.\n"
            "Run:  uv add --dev playwright && uv run playwright install chromium"
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp_str:
        repo = make_fixture_repo(Path(tmp_str))

        env = {**os.environ, "DIFFLICIOUS_PORT": str(PORT), "DIFFLICIOUS_HOST": "127.0.0.1"}
        server = subprocess.Popen(
            ["uv", "run", "difflicious"],
            cwd=repo,
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        try:
            print(f"Waiting for server on {URL} …")
            wait_for_server(URL)

            with sync_playwright() as p:
                for scheme in ("light", "dark"):
                    browser = p.chromium.launch()
                    ctx = browser.new_context(
                        viewport={"width": 1440, "height": 900},
                        color_scheme=scheme,
                    )
                    page = ctx.new_page()
                    page.goto(URL)
                    # "networkidle" never fires because the SSE auto-reload
                    # connection is always open.  Wait for the page to load,
                    # then block until at least one diff file header appears.
                    page.wait_for_load_state("load")
                    page.wait_for_selector(".file-header", timeout=15_000)

                    # Files are collapsed by default — click each header to expand
                    for header in page.query_selector_all(".file-header"):
                        header.click()
                    page.wait_for_timeout(400)  # let expansion animate

                    # Scroll back to the top so the nav bar is in frame
                    page.evaluate("window.scrollTo(0, 0)")
                    page.wait_for_timeout(150)  # let scroll settle

                    out = OUT_DIR / f"{scheme}.png"
                    page.screenshot(path=str(out))
                    print(f"  ✓ {scheme:5s}  →  {out}")
                    browser.close()

        finally:
            server.terminate()
            server.wait()

    print("Done.")


if __name__ == "__main__":
    main()
