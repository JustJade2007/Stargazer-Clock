"""
Stargazer Clock - Desktop Application Launcher
Serves local web assets and opens a dedicated, chromeless application window
via Microsoft Edge App Mode or the default system browser.
"""

import sys
import os
import time
import socket
import threading
import subprocess
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

def get_base_dir():
    """Returns the base directory for assets whether running in development or PyInstaller bundle."""
    if getattr(sys, 'frozen', False):
        # Running in a PyInstaller bundle
        return getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))

def find_free_port():
    """Finds an available TCP port on localhost."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

# Global set of HWNDs to keep pinned topmost
PINNED_HWNDS = set()
PIN_LOCK = threading.Lock()

if sys.platform == 'win32':
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32

    # Set 64-bit argument and return types for user32 APIs
    user32.SetWindowPos.argtypes = [
        wintypes.HWND,
        wintypes.HWND,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_uint
    ]
    user32.SetWindowPos.restype = wintypes.BOOL

    if hasattr(user32, 'GetWindowLongPtrW'):
        user32.GetWindowLongPtrW.argtypes = [wintypes.HWND, ctypes.c_int]
        user32.GetWindowLongPtrW.restype = ctypes.c_ssize_t
        get_win_long = user32.GetWindowLongPtrW
    else:
        user32.GetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int]
        user32.GetWindowLongW.restype = ctypes.c_long
        get_win_long = user32.GetWindowLongW

    if hasattr(user32, 'SetWindowLongPtrW'):
        user32.SetWindowLongPtrW.argtypes = [wintypes.HWND, ctypes.c_int, ctypes.c_ssize_t]
        user32.SetWindowLongPtrW.restype = ctypes.c_ssize_t
        set_win_long = user32.SetWindowLongPtrW
    else:
        user32.SetWindowLongW.argtypes = [wintypes.HWND, ctypes.c_int, ctypes.c_long]
        user32.SetWindowLongW.restype = ctypes.c_long
        set_win_long = user32.SetWindowLongW

    # True 64-bit HWND constants
    HWND_TOPMOST = wintypes.HWND(-1)
    HWND_NOTOPMOST = wintypes.HWND(-2)

    GWL_EXSTYLE = -20
    WS_EX_TOPMOST = 0x00000008

    SWP_NOMOVE = 0x0002
    SWP_NOSIZE = 0x0001
    SWP_SHOWWINDOW = 0x0040
    SWP_NOACTIVATE = 0x0010

    def find_windows_matching(title_filter):
        """Finds all visible top-level windows matching a substring in title."""
        matched = []
        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, ctypes.c_void_p)

        def callback(hwnd, lParam):
            if user32.IsWindowVisible(hwnd):
                length = user32.GetWindowTextLengthW(hwnd)
                if length > 0:
                    buff = ctypes.create_unicode_buffer(length + 1)
                    user32.GetWindowTextW(hwnd, buff, length + 1)
                    title = buff.value
                    if title_filter.lower() in title.lower():
                        matched.append(hwnd)
            return True

        proc = WNDENUMPROC(callback)
        user32.EnumWindows(proc, 0)
        return matched

    def apply_window_pin(hwnd, pin_state):
        """Applies or removes WS_EX_TOPMOST and HWND_TOPMOST."""
        try:
            if not user32.IsWindow(hwnd):
                return False
            curr_ex = get_win_long(hwnd, GWL_EXSTYLE)
            if pin_state:
                set_win_long(hwnd, GWL_EXSTYLE, curr_ex | WS_EX_TOPMOST)
                user32.SetWindowPos(
                    hwnd,
                    HWND_TOPMOST,
                    0, 0, 0, 0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_NOACTIVATE
                )
            else:
                set_win_long(hwnd, GWL_EXSTYLE, curr_ex & ~WS_EX_TOPMOST)
                user32.SetWindowPos(
                    hwnd,
                    HWND_NOTOPMOST,
                    0, 0, 0, 0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_NOACTIVATE
                )
            return True
        except Exception:
            return False

    def pin_maintenance_worker():
        """Background daemon keeping pinned windows persistently above other apps."""
        while True:
            try:
                time.sleep(0.4)
                with PIN_LOCK:
                    dead = []
                    for hwnd in list(PINNED_HWNDS):
                        if user32.IsWindow(hwnd):
                            user32.SetWindowPos(
                                hwnd,
                                HWND_TOPMOST,
                                0, 0, 0, 0,
                                SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE
                            )
                        else:
                            dead.append(hwnd)
                    for d in dead:
                        PINNED_HWNDS.discard(d)
            except Exception:
                pass

    maintenance_thread = threading.Thread(target=pin_maintenance_worker, daemon=True)
    maintenance_thread.start()

class QuietHandler(SimpleHTTPRequestHandler):
    """HTTP Request Handler that serves files silently and handles window pinning API."""
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path.startswith('/api/pin'):
            try:
                import urllib.parse
                parsed = urllib.parse.urlparse(self.path)
                params = urllib.parse.parse_qs(parsed.query)
                pin_state = params.get('state', ['1'])[0] == '1'
                title_filter = params.get('title', ['Stargazer'])[0]

                success = False
                if sys.platform == 'win32':
                    def scan_and_apply():
                        # Try immediately and across a few intervals to catch opening windows
                        for _ in range(6):
                            hwnds = find_windows_matching(title_filter)
                            if not hwnds and 'popout' in title_filter.lower():
                                hwnds = find_windows_matching('Stargazer')
                            if hwnds:
                                with PIN_LOCK:
                                    for h in hwnds:
                                        apply_window_pin(h, pin_state)
                                        if pin_state:
                                            PINNED_HWNDS.add(h)
                                        else:
                                            PINNED_HWNDS.discard(h)
                                break
                            time.sleep(0.15)

                    threading.Thread(target=scan_and_apply, daemon=True).start()
                    success = True

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                import json
                self.wfile.write(json.dumps({'success': success, 'pinned': pin_state}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error": "Failed to set topmost window"}')
                return
        return super().do_GET()

def start_server(base_dir, port):
    """Starts the local static file server."""
    os.chdir(base_dir)
    server = ThreadingHTTPServer(('127.0.0.1', port), QuietHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server

def find_browser_executable():
    """Finds Microsoft Edge or Google Chrome executable paths on Windows."""
    candidates = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None

def main():
    base_dir = get_base_dir()
    port = find_free_port()
    start_server(base_dir, port)

    url = f"http://127.0.0.1:{port}/index.html"
    browser_exe = find_browser_executable()

    if browser_exe:
        # Launch dedicated app window without browser URL bar or extraneous controls
        cmd = [
            browser_exe,
            f"--app={url}",
            "--window-size=1120,780",
            "--window-position=center",
            "--disable-extensions",
            "--app-auto-launched"
        ]
        proc = subprocess.Popen(cmd)
        proc.wait()
    else:
        # Fallback to default browser
        webbrowser.open(url)
        # Keep background server alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
