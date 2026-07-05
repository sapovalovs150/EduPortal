import argparse
import json
import sys
import unicodedata
from pathlib import Path

from firefox_webdriver import FirefoxWebDriver, ROOT, find_free_port


DEFAULT_BASE_URL = "http://127.0.0.1:8081"
OUT_DIR = ROOT / "docs" / "screenshots" / "webdriver-firefox"


def normalize_text(value: str) -> str:
    return unicodedata.normalize("NFKC", value).replace("\xa0", " ").strip().lower()


def wait_for(driver: FirefoxWebDriver, predicate_script: str, timeout_seconds: float = 20.0) -> bool:
    import time

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            if driver.execute(predicate_script):
                return True
        except Exception:
            pass
        time.sleep(0.5)
    return False


def click_login_button(driver: FirefoxWebDriver) -> None:
    driver.execute(
        """
        const candidates = [...document.querySelectorAll('button, [role="button"], div')];
        const target = candidates.find((node) =>
          node.innerText && node.innerText.toLowerCase().includes('войти')
        );
        if (!target) throw new Error('Login control not found');
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return true;
        """
    )


def fill_student_group(driver: FirefoxWebDriver, group_name: str) -> None:
    driver.execute(
        """
        const input = document.querySelector('input');
        if (!input) throw new Error('Login input not found');
        input.focus();
        input.value = arguments[0];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return input.value;
        """,
        [group_name],
    )


def choose_student_group(driver: FirefoxWebDriver, group_name: str) -> str:
    return driver.execute(
        """
        const wanted = arguments[0].trim().toLowerCase();
        const all = [...document.querySelectorAll('div')]
          .map((node) => ({ node, text: (node.innerText || '').trim() }))
          .filter((entry) => entry.text);
        const exact = all.find((entry) => entry.text.toLowerCase() === wanted);
        const fallback = all.find((entry) => {
          const rect = entry.node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && /^[а-яa-z0-9-]+$/i.test(entry.text);
        });
        const target = (exact || fallback)?.node;
        if (!target) throw new Error(`Group option not found: ${arguments[0]}`);
        const rect = target.getBoundingClientRect();
        if (!(rect.width > 0 && rect.height > 0)) throw new Error('Group option is not visible');
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return (target.innerText || '').trim();
        """,
        [group_name],
    )


def run_smoke(base_url: str, student_group: str, skip_login: bool) -> dict:
    port = find_free_port()
    with FirefoxWebDriver(port=port, log_name="tmp_geckodriver_smoke.log") as driver:
        driver.set_window_rect(1280, 900)
        driver.goto(base_url, wait_seconds=5)

        result = {
            "base_url": base_url,
            "title": driver.title(),
            "before_login_text": driver.body_text(1200),
            "artifacts": [],
        }

        before_path = driver.screenshot(OUT_DIR / "home_desktop_1280.png")
        result["artifacts"].append(str(before_path))

        driver.set_window_rect(390, 844)
        mobile_path = driver.screenshot(OUT_DIR / "home_mobile_390.png")
        result["artifacts"].append(str(mobile_path))

        if not skip_login:
            fill_student_group(driver, student_group)
            wait_for(
                driver,
                """
                const wanted = arguments[0].trim().toLowerCase();
                return [...document.querySelectorAll('div')].some((node) => {
                  const text = (node.innerText || '').trim().toLowerCase();
                  return text === wanted;
                });
                """.replace("arguments[0]", json.dumps(student_group)),
                timeout_seconds=10,
            )
            selected_group = choose_student_group(driver, student_group)
            click_login_button(driver)
            wait_for(
                driver,
                """
                const body = document.body ? document.body.innerText.toLowerCase() : '';
                return body.includes('расписание') || body.includes('консультац') || body.includes('аудит');
                """,
                timeout_seconds=20,
            )
            driver.set_window_rect(1280, 900)
            logged_path = driver.screenshot(OUT_DIR / "student_after_login_1280.png")
            result["artifacts"].append(str(logged_path))
            result["selected_group"] = selected_group
            result["after_login_text"] = driver.body_text(1600)

        return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Firefox-based smoke checks for the EduPortal web app.")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--student-group", default="ИТ-201")
    parser.add_argument("--skip-login", action="store_true")
    args = parser.parse_args()

    result = run_smoke(args.base_url, args.student_group, args.skip_login)
    report_path = OUT_DIR / "report.json"
    report_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({**result, "report_path": str(report_path)}, ensure_ascii=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
