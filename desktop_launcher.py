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

class QuietHandler(SimpleHTTPRequestHandler):
    """HTTP Request Handler that serves files silently without console logging."""
    def log_message(self, format, *args):
        pass

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
