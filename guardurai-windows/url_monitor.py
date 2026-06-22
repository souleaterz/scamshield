"""
Cross-browser active-tab URL monitor using Windows UI Automation.

Reads the address bar value directly from Chrome, Edge, Firefox, and Brave
without a proxy or driver. Calls on_url(url) whenever the active browser
tab navigates to a new URL.
"""
import time
import threading
import ctypes
import ctypes.wintypes

# UI Automation COM interface constants
UIA_EditControlTypeId = 0xC354
UIA_ValueValuePropertyId = 30045
UIA_NamePropertyId = 30005
UIA_ControlTypePropertyId = 30003

# These process names host a recognisable address-bar structure
BROWSER_PROCESSES = {
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
    "brave.exe",
    "opera.exe",
    "vivaldi.exe",
}


def _get_foreground_process() -> str:
    """Return the exe name of the foreground window's process (lowercase)."""
    try:
        import win32gui
        import win32process
        import psutil
        hwnd = win32gui.GetForegroundWindow()
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        return psutil.Process(pid).name().lower()
    except Exception:
        return ""


def _read_url_via_uia() -> str | None:
    """
    Use the Windows Accessibility (IUIAutomation) COM API to read the
    URL from the foreground browser's address bar.
    Returns the URL string or None if not found / not a browser.
    """
    try:
        import comtypes
        import comtypes.client

        # CoCreate IUIAutomation
        IUIAutomation = comtypes.client.CreateObject(
            "{ff48dba4-60ef-4201-aa87-54103eef594e}",
            interface=comtypes.GUID("{30cbe57d-d9d0-452a-ab13-7ac5ac4825ee}"),
        )

        # Get the element currently focused
        focused = IUIAutomation.GetFocusedElement()
        if focused is None:
            return None

        # Walk up to the root window and search for the address bar edit control
        # The address bar in Chromium browsers is an Edit control named "Address and search bar"
        # Firefox names it "Search with Google or enter address"
        root = IUIAutomation.ElementFromHandle(
            ctypes.windll.user32.GetForegroundWindow()
        )
        if root is None:
            return None

        # Build a condition: ControlType == Edit
        condition = IUIAutomation.CreatePropertyCondition(
            UIA_ControlTypePropertyId,
            UIA_EditControlTypeId,
        )

        elements = root.FindAll(
            # TreeScope_Descendants = 4
            4,
            condition,
        )
        if elements is None:
            return None

        for i in range(elements.Length):
            el = elements.GetElement(i)
            try:
                name = el.GetCurrentPropertyValue(UIA_NamePropertyId) or ""
                name_lower = str(name).lower()
                # Chromium address bars
                if "address" in name_lower or "search bar" in name_lower or "location" in name_lower:
                    val = el.GetCurrentPropertyValue(UIA_ValueValuePropertyId) or ""
                    val = str(val).strip()
                    if val.startswith("http") or val.startswith("www."):
                        return val
            except Exception:
                continue

    except Exception:
        pass
    return None


class UrlMonitor:
    """
    Polls the foreground browser's address bar every POLL seconds.
    Calls on_url(url) when the URL changes.
    """
    POLL = 1.5

    def __init__(self, on_url):
        self._on_url = on_url
        self._last = ""

    def run_forever(self):
        while True:
            try:
                proc = _get_foreground_process()
                if proc in BROWSER_PROCESSES:
                    url = _read_url_via_uia()
                    if url and url != self._last:
                        self._last = url
                        self._on_url(url)
            except Exception:
                pass
            time.sleep(self.POLL)

    def start(self):
        t = threading.Thread(target=self.run_forever, daemon=True)
        t.start()
