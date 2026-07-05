import base64
import json
import os
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GECKODRIVER_EXE = ROOT / "tools" / "geckodriver" / "geckodriver.exe"
FIREFOX_EXE = Path(r"C:\Program Files\Mozilla Firefox\firefox.exe")


class FirefoxWebDriver:
    def __init__(self, port: int = 4444, log_name: str = "tmp_geckodriver.log"):
        self.port = port
        self.base = f"http://127.0.0.1:{port}"
        self.log_path = ROOT / log_name
        self.process: subprocess.Popen | None = None
        self.session_id: str | None = None

    def __enter__(self):
        self.start()
        self.create_session()
        return self

    def __exit__(self, exc_type, exc, tb):
        self.close()

    def start(self) -> None:
        if not GECKODRIVER_EXE.exists():
            raise FileNotFoundError(f"Missing geckodriver: {GECKODRIVER_EXE}")
        if not FIREFOX_EXE.exists():
            raise FileNotFoundError(f"Missing Firefox: {FIREFOX_EXE}")

        env = os.environ.copy()
        # Firefox content subprocesses fail in this Codex environment unless
        # sandboxing and e10s are relaxed for the session.
        env["MOZ_DISABLE_CONTENT_SANDBOX"] = "1"
        env["MOZ_DISABLE_GMP_SANDBOX"] = "1"
        env["MOZ_DISABLE_RDD_SANDBOX"] = "1"
        env["MOZ_FORCE_DISABLE_E10S"] = "1"

        log_file = self.log_path.open("w", encoding="utf-8")
        self.process = subprocess.Popen(
            [str(GECKODRIVER_EXE), "--port", str(self.port)],
            stdout=log_file,
            stderr=subprocess.STDOUT,
            env=env,
        )
        self._wait_until_ready()

    def _wait_until_ready(self, timeout: float = 30.0) -> None:
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                self.request("GET", "/status")
                return
            except Exception:
                time.sleep(0.25)
        raise TimeoutError("geckodriver did not start in time")

    def create_session(self) -> None:
        response = self.request(
            "POST",
            "/session",
            {
                "capabilities": {
                    "alwaysMatch": {
                        "browserName": "firefox",
                        "acceptInsecureCerts": True,
                        "moz:firefoxOptions": {
                            "binary": str(FIREFOX_EXE),
                            "args": ["-headless"],
                            "prefs": {
                                "browser.tabs.remote.autostart": False,
                                "browser.tabs.remote.autostart.2": False,
                                "fission.autostart": False,
                            },
                        },
                    }
                }
            },
        )
        self.session_id = response.get("sessionId") or response["value"]["sessionId"]

    def request(self, method: str, path: str, data=None):
        body = None
        headers = {}
        if data is not None:
            body = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(self.base + path, data=body, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                payload = response.read().decode("utf-8")
                return json.loads(payload)
        except urllib.error.HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"WebDriver {method} {path} failed: HTTP {error.code} {details}") from error

    def _session_path(self, suffix: str) -> str:
        if not self.session_id:
            raise RuntimeError("WebDriver session is not created")
        return f"/session/{self.session_id}{suffix}"

    def set_window_rect(self, width: int, height: int) -> None:
        self.request("POST", self._session_path("/window/rect"), {"width": width, "height": height})

    def goto(self, url: str, wait_seconds: float = 4.0) -> None:
        self.request("POST", self._session_path("/url"), {"url": url})
        time.sleep(wait_seconds)

    def title(self) -> str:
        return self.request("GET", self._session_path("/title"))["value"]

    def body_text(self, limit: int = 1000) -> str:
        response = self.request(
            "POST",
            self._session_path("/execute/sync"),
            {
                "script": "return document.body ? document.body.innerText.slice(0, arguments[0]) : '';",
                "args": [limit],
            },
        )
        return response["value"]

    def execute(self, script: str, args=None):
        if args is None:
            args = []
        response = self.request(
            "POST",
            self._session_path("/execute/sync"),
            {"script": script, "args": args},
        )
        return response["value"]

    def screenshot(self, output_path: Path) -> Path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        shot = self.request("GET", self._session_path("/screenshot"))["value"]
        output_path.write_bytes(base64.b64decode(shot))
        return output_path

    def close(self) -> None:
        if self.session_id:
            try:
                self.request("DELETE", self._session_path(""))
            except Exception:
                pass
            self.session_id = None
        if self.process:
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
            except Exception:
                self.process.kill()
            self.process = None


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]
