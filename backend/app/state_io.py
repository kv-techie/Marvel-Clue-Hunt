import json
import os
import tempfile
import threading
from contextlib import contextmanager
from typing import Any

_STATE_WRITE_LOCK = threading.RLock()


@contextmanager
def state_write_lock():
    with _STATE_WRITE_LOCK:
        yield


def atomic_write_json(file_path: str, data: Any, **dump_kwargs):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with _STATE_WRITE_LOCK:
        fd, temp_path = tempfile.mkstemp(
            prefix=".__tmp_", suffix=".json", dir=os.path.dirname(file_path)
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as tmp_file:
                json.dump(data, tmp_file, **dump_kwargs)
                tmp_file.flush()
                os.fsync(tmp_file.fileno())

            os.replace(temp_path, file_path)
        except Exception:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise
