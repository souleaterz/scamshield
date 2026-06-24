"""
Cross-browser active-tab URL monitor using Windows UI Automation.

Reads the address bar value directly from Chrome, Edge, Firefox, and Brave
without a proxy or driver. Calls on_url(url) whenever the active browser
tab navigates to a new URL.
"""
import time
import threading
import os
import re
import ctypes
import ctypes.wintypes

# The browser omnibox usually shows the host WITHOUT a scheme ("guardurai.com"
# or "guardurai.com/family"), not "https://…". Treat anything that looks like a
# hostname (no spaces, has a dot, a real letter TLD) as a URL and add https://.
_OMNIBOX_RE = re.compile(r"^(https?://)?([a-z0-9-]+\.)+[a-z]{2,}(?:[:/?#].*)?$", re.I)


def _normalize_omnibox(val: str) -> str | None:
    val = (val or "").strip()
    if not val or " " in val:
        return None
    if not _OMNIBOX_RE.match(val):
        return None
    if not val.lower().startswith(("http://", "https://")):
        val = "https://" + val
    return val

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
    # Primary: psutil (declared in requirements).
    try:
        import win32gui
        import win32process
        import psutil
        hwnd = win32gui.GetForegroundWindow()
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        return psutil.Process(pid).name().lower()
    except Exception:
        pass
    # Fallback: pure ctypes, so a missing/broken dependency can't silently
    # disable browser monitoring (which is exactly what happened before).
    return _foreground_process_ctypes()


def _foreground_process_ctypes() -> str:
    try:
        from ctypes import wintypes
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        user32.GetForegroundWindow.restype = wintypes.HWND
        user32.GetWindowThreadProcessId.argtypes = [
            wintypes.HWND, ctypes.POINTER(wintypes.DWORD)
        ]
        kernel32.OpenProcess.restype = wintypes.HANDLE
        kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel32.QueryFullProcessImageNameW.argtypes = [
            wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR,
            ctypes.POINTER(wintypes.DWORD),
        ]
        kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL

        hwnd = user32.GetForegroundWindow()
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
        handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return ""
        try:
            buf = ctypes.create_unicode_buffer(512)
            size = wintypes.DWORD(512)
            if kernel32.QueryFullProcessImageNameW(handle, 0, buf, ctypes.byref(size)):
                return os.path.basename(buf.value).lower()
        finally:
            kernel32.CloseHandle(handle)
    except Exception:
        pass
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
                    val = str(el.GetCurrentPropertyValue(UIA_ValueValuePropertyId) or "")
                    norm = _normalize_omnibox(val)
                    if norm:
                        return norm
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
