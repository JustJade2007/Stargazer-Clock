"""
Stargazer Clock - Desktop Application Launcher
Serves local web assets and opens a dedicated, chromeless application window
via Microsoft Edge App Mode, Google Chrome, or other Chromium browsers,
with native OS-level Always-on-Top pinning for the compact popout clock.
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

# State tracking for pinned popout window
PINNED_HWNDS = set()
PIN_LOCK = threading.Lock()
GLOBAL_PIN_ACTIVE = False
LAUNCHER_PORT = None

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
    SWP_FRAMECHANGED = 0x0020

    user32.SetForegroundWindow.argtypes = [wintypes.HWND]
    user32.SetForegroundWindow.restype = wintypes.BOOL

    def get_window_title(hwnd):
        """Retrieves window text safely."""
        try:
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buff = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buff, length + 1)
                return buff.value
        except Exception:
            pass
        return ""

    def get_window_rect(hwnd):
        """Retrieves window dimensions (left, top, width, height) safely."""
        try:
            rect = wintypes.RECT()
            if user32.GetWindowRect(hwnd, ctypes.byref(rect)):
                return rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top
        except Exception:
            pass
        return 0, 0, 0, 0

    def is_popout_window(hwnd):
        """Determines if the given HWND is the compact popout clock window."""
        try:
            if not user32.IsWindow(hwnd) or not user32.IsWindowVisible(hwnd):
                return False
            _, _, w, h = get_window_rect(hwnd)
            # Popout widget is compact (up to 850x750 for high DPI / custom sizing, but < 1120x780 main app)
            if w < 40 or w > 880 or h < 40 or h > 750:
                return False

            title = get_window_title(hwnd).lower()

            # Main dashboard title should never be treated as popout
            if 'celestial dashboard' in title:
                return False

            # 1. Chromium Document Picture-in-Picture window titles:
            # Chromium PiP windows display the origin in the title bar (e.g., "127.0.0.1:54371" or "localhost")
            if '127.0.0.1' in title or 'localhost' in title:
                return True
            if LAUNCHER_PORT and str(LAUNCHER_PORT) in title:
                return True

            # 2. Explicit keywords in title
            if any(k in title for k in ['popout', 'picture in picture', 'picture-in-picture', 'pictureinpicture', 'pip']):
                return True

            # 3. Chromium top-level widget class check (Chrome_WidgetWin_1 / Edge_WidgetWin_1)
            class_buf = ctypes.create_unicode_buffer(256)
            user32.GetClassNameW(hwnd, class_buf, 256)
            cname = class_buf.value.lower()
            if 'chrome_widgetwin' in cname or 'edge_widgetwin' in cname:
                if 'stargazer' not in title or 'popout' in title:
                    return True

            return False
        except Exception:
            return False

    def is_main_window(hwnd):
        """Determines if the given HWND is the primary application dashboard window."""
        try:
            if not user32.IsWindow(hwnd) or not user32.IsWindowVisible(hwnd):
                return False
            if is_popout_window(hwnd):
                return False
            title = get_window_title(hwnd).lower()
            _, _, w, h = get_window_rect(hwnd)
            # Main window is large (>= 700 width and >= 500 height)
            is_large = (w >= 700) and (h >= 500)
            is_stargazer = 'stargazer' in title or 'celestial dashboard' in title
            return is_stargazer and is_large
        except Exception:
            return False

    def find_popout_windows():
        """Finds all visible top-level windows matching the popout widget."""
        matched = []
        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, ctypes.c_void_p)

        def callback(hwnd, lParam):
            if is_popout_window(hwnd):
                matched.append(hwnd)
            return True

        proc = WNDENUMPROC(callback)
        user32.EnumWindows(proc, 0)
        return matched

    def find_main_windows():
        """Finds all visible top-level windows matching the main app."""
        matched = []
        WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, ctypes.c_void_p)

        def callback(hwnd, lParam):
            if is_main_window(hwnd):
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
                    SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_NOACTIVATE | SWP_FRAMECHANGED
                )
            else:
                set_win_long(hwnd, GWL_EXSTYLE, curr_ex & ~WS_EX_TOPMOST)
                user32.SetWindowPos(
                    hwnd,
                    HWND_NOTOPMOST,
                    0, 0, 0, 0,
                    SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_NOACTIVATE | SWP_FRAMECHANGED
                )
            return True
        except Exception:
            return False

    def unpin_main_windows():
        """Ensures the main application window is NEVER topmost, preventing it from covering the popout."""
        try:
            main_hwnds = find_main_windows()
            for h in main_hwnds:
                apply_window_pin(h, False)
                with PIN_LOCK:
                    PINNED_HWNDS.discard(h)
        except Exception:
            pass

    def pin_maintenance_worker():
        """Background daemon ensuring only the popout is pinned and stays topmost across focus changes."""
        while True:
            try:
                time.sleep(0.2)
                if not GLOBAL_PIN_ACTIVE:
                    continue

                with PIN_LOCK:
                    dead = []
                    for hwnd in list(PINNED_HWNDS):
                        if user32.IsWindow(hwnd) and user32.IsWindowVisible(hwnd):
                            if not is_popout_window(hwnd):
                                apply_window_pin(hwnd, False)
                                dead.append(hwnd)
                                continue

                            # Re-assert topmost position in Z-order without stealing focus
                            user32.SetWindowPos(
                                hwnd,
                                HWND_TOPMOST,
                                0, 0, 0, 0,
                                SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW | SWP_NOACTIVATE
                            )
                        else:
                            dead.append(hwnd)
                    for d in dead:
                        PINNED_HWNDS.discard(d)

                    # If global pin is active but no HWND registered yet, discover and pin
                    if not PINNED_HWNDS:
                        popouts = find_popout_windows()
                        for h in popouts:
                            apply_window_pin(h, True)
                            PINNED_HWNDS.add(h)
            except Exception:
                pass

    maintenance_thread = threading.Thread(target=pin_maintenance_worker, daemon=True)
    maintenance_thread.start()

class QuietHandler(SimpleHTTPRequestHandler):
    """HTTP Request Handler that serves files silently and handles window pinning API."""
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        global GLOBAL_PIN_ACTIVE, LAUNCHER_PORT
        if self.path.startswith('/api/pin'):
            try:
                import urllib.parse
                parsed = urllib.parse.urlparse(self.path)
                params = urllib.parse.parse_qs(parsed.query)
                pin_state = params.get('state', ['1'])[0] == '1'
                GLOBAL_PIN_ACTIVE = pin_state

                # Check client port if provided
                client_port = params.get('port', [None])[0]
                if client_port:
                    try:
                        LAUNCHER_PORT = int(client_port)
                    except Exception:
                        pass
                elif not LAUNCHER_PORT:
                    try:
                        LAUNCHER_PORT = self.server.server_address[1]
                    except Exception:
                        pass

                success = False
                if sys.platform == 'win32':
                    # Ensure main window is unpinned
                    unpin_main_windows()

                    if not pin_state:
                        with PIN_LOCK:
                            for h in list(PINNED_HWNDS):
                                apply_window_pin(h, False)
                            PINNED_HWNDS.clear()
                        for h in find_popout_windows():
                            apply_window_pin(h, False)
                        success = True
                    else:
                        def scan_and_apply():
                            # Scan repeatedly for up to 3 seconds to catch newly spawned popout/PiP window
                            for _ in range(30):
                                hwnds = find_popout_windows()
                                if hwnds:
                                    with PIN_LOCK:
                                        for h in hwnds:
                                            apply_window_pin(h, True)
                                            PINNED_HWNDS.add(h)
                                    break
                                time.sleep(0.1)

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
    global LAUNCHER_PORT
    LAUNCHER_PORT = port
    os.chdir(base_dir)
    server = ThreadingHTTPServer(('127.0.0.1', port), QuietHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server

def find_browser_executable():
    """Finds Microsoft Edge, Google Chrome, Brave, Samsung Internet, or Opera executable paths on Windows."""
    candidates = [
        # Microsoft Edge (Standard)
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe"),
        # Google Chrome
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe"),
        # Brave
        os.path.expandvars(r"%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        os.path.expandvars(r"%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        # Samsung Internet
        os.path.expandvars(r"%ProgramFiles%\Samsung\Internet\Application\samsunginternet.exe"),
        # Opera / Opera GX
        os.path.expandvars(r"%LocalAppData%\Programs\Opera GX\opera.exe"),
        os.path.expandvars(r"%LocalAppData%\Programs\Opera\opera.exe"),
    ]

    # Check Microsoft EdgeCore (Windows on ARM, Edge WebView, or Canary/Dev builds)
    edgecore_base = os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\EdgeCore")
    if os.path.isdir(edgecore_base):
        try:
            for root, dirs, files in os.walk(edgecore_base):
                if "msedge.exe" in files:
                    candidates.insert(0, os.path.join(root, "msedge.exe"))
                    break
        except Exception:
            pass

    # Check Windows Registry App Paths
    if sys.platform == 'win32':
        try:
            import winreg
            for hive in [winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER]:
                for app_name in ['msedge.exe', 'chrome.exe', 'brave.exe', 'samsunginternet.exe', 'opera.exe']:
                    try:
                        with winreg.OpenKey(hive, rf"Software\Microsoft\Windows\CurrentVersion\App Paths\{app_name}") as k:
                            reg_path = winreg.QueryValueEx(k, '')[0].strip('"')
                            if reg_path and reg_path not in candidates:
                                candidates.append(reg_path)
                    except Exception:
                        pass
        except Exception:
            pass

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
        if sys.platform == 'win32':
            threading.Timer(1.5, unpin_main_windows).start()
            threading.Timer(3.5, unpin_main_windows).start()
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
