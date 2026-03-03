"""
Terminal manager — cross-platform PTY spawning for web-based terminals.

Spawns an interactive shell (PowerShell on Windows, default shell on Unix)
in a given working directory. Provides async read/write helpers for bridging
a WebSocket to the PTY process.
"""

import asyncio
import logging
import os
import sys

logger = logging.getLogger(__name__)

# Default shell to spawn per platform
_DEFAULT_SHELL_WIN = "powershell.exe"
_DEFAULT_SHELL_UNIX = os.environ.get("SHELL", "/bin/bash")

# Read chunk size / poll interval
_READ_SIZE = 4096
_POLL_INTERVAL = 0.02  # 20ms


class TerminalSession:
    """Wraps a PTY process with async read/write for WebSocket bridging."""

    def __init__(self, cwd: str | None = None, cols: int = 120, rows: int = 30):
        self._cwd = cwd or os.path.expanduser("~")
        self._cols = cols
        self._rows = rows
        self._process: object | None = None
        self._closed = False

    async def start(self) -> None:
        """Spawn the shell process in the configured CWD."""
        if sys.platform == "win32":
            await self._start_windows()
        else:
            await self._start_unix()

    async def _start_windows(self) -> None:
        from winpty import PtyProcess  # type: ignore[import-untyped]

        self._process = PtyProcess.spawn(
            _DEFAULT_SHELL_WIN,
            dimensions=(self._rows, self._cols),
            cwd=self._cwd,
        )

    async def _start_unix(self) -> None:
        import pty
        import select
        import struct
        import fcntl
        import termios

        master_fd, slave_fd = pty.openpty()

        # Set initial window size
        winsize = struct.pack("HHHH", self._rows, self._cols, 0, 0)
        fcntl.ioctl(slave_fd, termios.TIOCSWINSZ, winsize)

        pid = os.fork()
        if pid == 0:
            # Child
            os.setsid()
            os.dup2(slave_fd, 0)
            os.dup2(slave_fd, 1)
            os.dup2(slave_fd, 2)
            os.close(master_fd)
            os.close(slave_fd)
            os.chdir(self._cwd)
            os.execvp(_DEFAULT_SHELL_UNIX, [_DEFAULT_SHELL_UNIX])
        else:
            os.close(slave_fd)
            self._process = _UnixPty(pid, master_fd, select)

    async def read(self) -> str | None:
        """Read available output from the PTY. Returns None if closed."""
        if self._closed or not self._process:
            return None
        try:
            loop = asyncio.get_event_loop()
            data = await loop.run_in_executor(None, self._sync_read)
            return data
        except Exception:
            self._closed = True
            return None

    def _sync_read(self) -> str:
        """Blocking read — called from executor."""
        if sys.platform == "win32":
            proc = self._process  # PtyProcess
            if not proc or not proc.isalive():  # type: ignore[union-attr]
                self._closed = True
                return ""
            try:
                return proc.read(4096)  # type: ignore[union-attr]
            except EOFError:
                self._closed = True
                return ""
        else:
            pty_obj: _UnixPty = self._process  # type: ignore[assignment]
            return pty_obj.read()

    async def write(self, data: str) -> None:
        """Write user input to the PTY."""
        if self._closed or not self._process:
            return
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self._sync_write, data)
        except Exception:
            self._closed = True

    def _sync_write(self, data: str) -> None:
        if sys.platform == "win32":
            self._process.write(data)  # type: ignore[union-attr]
        else:
            pty_obj: _UnixPty = self._process  # type: ignore[assignment]
            pty_obj.write(data)

    async def resize(self, cols: int, rows: int) -> None:
        """Resize the PTY."""
        self._cols = cols
        self._rows = rows
        if not self._process or self._closed:
            return
        try:
            if sys.platform == "win32":
                self._process.setwinsize(rows, cols)  # type: ignore[union-attr]
            else:
                pty_obj: _UnixPty = self._process  # type: ignore[assignment]
                pty_obj.resize(rows, cols)
        except Exception as e:
            logger.debug("PTY resize failed: %s", e)

    @property
    def is_alive(self) -> bool:
        if self._closed or not self._process:
            return False
        if sys.platform == "win32":
            return self._process.isalive()  # type: ignore[union-attr]
        pty_obj: _UnixPty = self._process  # type: ignore[assignment]
        return pty_obj.is_alive

    def close(self) -> None:
        """Terminate the PTY process and clean up."""
        if self._closed:
            return
        self._closed = True
        if not self._process:
            return
        try:
            if sys.platform == "win32":
                if self._process.isalive():  # type: ignore[union-attr]
                    self._process.terminate()  # type: ignore[union-attr]
            else:
                pty_obj: _UnixPty = self._process  # type: ignore[assignment]
                pty_obj.close()
        except Exception as e:
            logger.debug("PTY close error: %s", e)


class _UnixPty:
    """Thin wrapper around a Unix PTY master fd + child pid."""

    def __init__(self, pid: int, master_fd: int, select_mod: object):
        self.pid = pid
        self.master_fd = master_fd
        self._select = select_mod
        self._alive = True

    def read(self) -> str:
        import select as sel

        ready, _, _ = sel.select([self.master_fd], [], [], _POLL_INTERVAL)
        if ready:
            data = os.read(self.master_fd, _READ_SIZE)
            if not data:
                self._alive = False
                return ""
            return data.decode("utf-8", errors="replace")
        return ""

    def write(self, data: str) -> None:
        os.write(self.master_fd, data.encode("utf-8"))

    def resize(self, rows: int, cols: int) -> None:
        import struct
        import fcntl
        import termios

        winsize = struct.pack("HHHH", rows, cols, 0, 0)
        fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)

    @property
    def is_alive(self) -> bool:
        if not self._alive:
            return False
        try:
            pid, status = os.waitpid(self.pid, os.WNOHANG)
            if pid != 0:
                self._alive = False
                return False
            return True
        except ChildProcessError:
            self._alive = False
            return False

    def close(self) -> None:
        import signal

        try:
            os.kill(self.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            os.close(self.master_fd)
        except OSError:
            pass
        self._alive = False
