"""Move the game's backups out of the game folder and into Cloude's.

Takes everything in D:\\Sadias Canvas\\.backups, moves it to
Desktop\\cloude\\backups\\sadias_canvas, and removes the empty .backups folder.
Nothing is deleted: a file that already exists at the destination gets a numbered
name instead of being overwritten. Double-click to run; safe to run twice.
"""
import shutil
import sys
from pathlib import Path

GAME = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r"D:\Sadias Canvas")
SRC = GAME / ".backups"
DEST = Path(__file__).resolve().parent.parent / "backups" / "sadias_canvas"


def free_name(path):
    if not path.exists():
        return path
    n = 1
    while (path.parent / f"{path.name}.{n}").exists():
        n += 1
    return path.parent / f"{path.name}.{n}"


def main():
    if not SRC.is_dir():
        print(f"No {SRC}, nothing to move.")
    else:
        DEST.mkdir(parents=True, exist_ok=True)
        moved = 0
        for item in sorted(SRC.iterdir()):
            shutil.move(str(item), str(free_name(DEST / item.name)))
            moved += 1
        try:
            SRC.rmdir()
        except OSError:
            pass
        print(f"Moved {moved} backup(s) to {DEST}.")
        print(".backups removed from the game folder." if not SRC.exists() else f"{SRC} is not empty; left it.")
    input("Press Enter to close.")


if __name__ == "__main__":
    main()
