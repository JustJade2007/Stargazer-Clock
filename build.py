"""
Stargazer Clock - Automated Build & Packaging Script
Packages the application into a standalone Windows executable (.exe) using PyInstaller.
"""

import os
import sys
import shutil
import subprocess

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(ROOT_DIR, "dist")
BUILD_DIR = os.path.join(ROOT_DIR, "build")

def clean_previous_builds():
    """Removes previous build artifacts to prevent stale caching."""
    if sys.platform == "win32":
        try:
            subprocess.run(["cmd.exe", "/c", f'attrib -r -s -h /s /d "{BUILD_DIR}\\*" & attrib -r -s -h "{BUILD_DIR}"'], capture_output=True)
            subprocess.run(["cmd.exe", "/c", f'attrib -r -s -h /s /d "{DIST_DIR}\\*" & attrib -r -s -h "{DIST_DIR}"'], capture_output=True)
        except Exception:
            pass

    for folder in [BUILD_DIR]:
        if os.path.exists(folder):
            try:
                shutil.rmtree(folder)
            except Exception as e:
                # If OneDrive or Windows indexer temporarily holds a handle, wait briefly or pass
                pass

def build_executable():
    """Compiles the standalone single-file executable."""
    clean_previous_builds()
    os.makedirs(DIST_DIR, exist_ok=True)

    app_name = "Stargazer-Clock"
    
    # Path separators for PyInstaller --add-data (Windows uses ;)
    sep = ";" if sys.platform == "win32" else ":"

    import tempfile
    temp_workpath = os.path.join(tempfile.gettempdir(), "stargazer_build")

    cmd = [
        sys.executable,
        "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--windowed", # Suppress console window
        "--name", app_name,
        f"--workpath={temp_workpath}",
        f"--distpath={DIST_DIR}",
        f"--add-data=index.html{sep}.",
        f"--add-data=css{sep}css",
        f"--add-data=js{sep}js",
        os.path.join(ROOT_DIR, "desktop_launcher.py")
    ]

    print("\n" + "=" * 60)
    print(f"  Building {app_name}.exe (One-File Windowed Standalone)...")
    print("=" * 60 + "\n")

    result = subprocess.run(cmd, cwd=ROOT_DIR)
    if result.returncode != 0:
        print(f"\n[ERROR] PyInstaller build failed with exit code {result.returncode}")
        sys.exit(result.returncode)

    exe_path = os.path.join(DIST_DIR, f"{app_name}.exe")
    if os.path.isfile(exe_path):
        size_mb = os.path.getsize(exe_path) / (1024 * 1024)
        print(f"\n[SUCCESS] Successfully compiled standalone executable:")
        print(f"  -> {exe_path} ({size_mb:.2f} MB)")
    else:
        print(f"\n[WARN] Build completed but {exe_path} was not found.")

if __name__ == "__main__":
    build_executable()
