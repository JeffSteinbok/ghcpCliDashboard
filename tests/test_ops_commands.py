"""Tests for autostart and upgrade refresh-message CLI commands."""

import argparse
import subprocess
import sys
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.dashboard_api import app
from src.session_dashboard import (
    TASK_NAME,
    _get_autostart_cmd,
    cmd_autostart,
    cmd_autostart_remove,
    cmd_upgrade,
)


# ---------------------------------------------------------------------------
# _get_autostart_cmd
# ---------------------------------------------------------------------------


class TestGetAutostartCmd:
    def test_uses_copilot_dashboard_when_found(self):
        with patch("shutil.which", return_value="/usr/bin/copilot-dashboard"):
            result = _get_autostart_cmd(5111)
        assert result == ["/usr/bin/copilot-dashboard", "start", "--background", "--port", "5111"]

    def test_falls_back_to_python_module(self):
        with patch("shutil.which", return_value=None):
            result = _get_autostart_cmd(8080)
        assert result[0] == sys.executable
        assert "-m" in result
        assert "8080" in result


# ---------------------------------------------------------------------------
# cmd_autostart — platform gate
# ---------------------------------------------------------------------------


class TestCmdAutostart:
    def test_errors_on_non_windows(self):
        args = argparse.Namespace(port=5111)
        with patch("src.session_dashboard.sys") as mock_sys:
            mock_sys.platform = "darwin"
            mock_sys.exit = MagicMock(side_effect=SystemExit(1))
            with pytest.raises(SystemExit):
                cmd_autostart(args)

    @patch("src.session_dashboard.sys")
    @patch("subprocess.run")
    @patch("shutil.which", return_value="C:\\copilot-dashboard.exe")
    def test_creates_task_on_windows(self, _which, mock_run, mock_sys):
        mock_sys.platform = "win32"
        mock_sys.exit = sys.exit
        mock_sys.executable = sys.executable
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        args = argparse.Namespace(port=5111)
        cmd_autostart(args)
        mock_run.assert_called_once()
        call_args = mock_run.call_args[0][0]
        assert call_args[0] == "schtasks"
        assert "/Create" in call_args
        assert TASK_NAME in call_args

    @patch("src.session_dashboard.sys")
    @patch("subprocess.run")
    @patch("shutil.which", return_value="C:\\copilot-dashboard.exe")
    def test_fails_gracefully(self, _which, mock_run, mock_sys):
        mock_sys.platform = "win32"
        mock_sys.exit = MagicMock(side_effect=SystemExit(1))
        mock_sys.executable = sys.executable
        mock_run.return_value = MagicMock(returncode=1, stderr="Access denied")
        args = argparse.Namespace(port=5111)
        with pytest.raises(SystemExit):
            cmd_autostart(args)


# ---------------------------------------------------------------------------
# cmd_autostart_remove — platform gate
# ---------------------------------------------------------------------------


class TestCmdAutostartRemove:
    def test_errors_on_non_windows(self):
        args = argparse.Namespace()
        with patch("src.session_dashboard.sys") as mock_sys:
            mock_sys.platform = "linux"
            mock_sys.exit = MagicMock(side_effect=SystemExit(1))
            with pytest.raises(SystemExit):
                cmd_autostart_remove(args)

    @patch("src.session_dashboard.sys")
    @patch("subprocess.run")
    def test_deletes_task_on_windows(self, mock_run, mock_sys):
        mock_sys.platform = "win32"
        mock_sys.exit = sys.exit
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        cmd_autostart_remove(argparse.Namespace())
        call_args = mock_run.call_args[0][0]
        assert "/Delete" in call_args
        assert TASK_NAME in call_args

    @patch("src.session_dashboard.sys")
    @patch("subprocess.run")
    def test_handles_not_found(self, mock_run, mock_sys, capsys):
        mock_sys.platform = "win32"
        mock_sys.exit = sys.exit
        mock_run.return_value = MagicMock(
            returncode=1, stderr="ERROR: The system cannot find the file specified."
        )
        cmd_autostart_remove(argparse.Namespace())
        out = capsys.readouterr().out
        assert "not currently configured" in out


# ---------------------------------------------------------------------------
# cmd_upgrade — refresh message
# ---------------------------------------------------------------------------


class TestUpgradeRefreshMessage:
    @patch("src.session_dashboard.subprocess.Popen")
    @patch("shutil.which", return_value="copilot-dashboard")
    @patch("src.session_dashboard.subprocess.run")
    @patch("src.session_dashboard._read_pid_file", return_value=12345)
    @patch("os.kill")
    @patch("os.path.exists", return_value=True)
    @patch("os.remove")
    def test_prints_refresh_message(
        self, _rm, _exists, _kill, _read_pid, mock_run, _which, _popen, capsys
    ):
        # pip upgrade succeeds
        mock_run.side_effect = [
            MagicMock(returncode=0),  # taskkill / stop
            MagicMock(returncode=0),  # pip install
            MagicMock(returncode=0, stdout="0.8.0\n"),  # version check
        ]
        cmd_upgrade(argparse.Namespace())
        out = capsys.readouterr().out
        assert "refresh your browser" in out.lower()


# ---------------------------------------------------------------------------
# API: /api/autostart endpoints
# ---------------------------------------------------------------------------


@pytest.fixture
def client():
    return TestClient(app)


class TestApiAutostartStatus:
    @patch("src.dashboard_api.sys")
    def test_supported_and_enabled(self, mock_sys, client):
        mock_sys.platform = "win32"
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            resp = client.get("/api/autostart")
        assert resp.status_code == 200
        data = resp.json()
        assert data["supported"] is True
        assert data["enabled"] is True

    @patch("src.dashboard_api.sys")
    def test_supported_but_not_enabled(self, mock_sys, client):
        mock_sys.platform = "win32"
        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=1)
            resp = client.get("/api/autostart")
        data = resp.json()
        assert data["supported"] is True
        assert data["enabled"] is False

    @patch("src.dashboard_api.sys")
    def test_not_supported_on_mac(self, mock_sys, client):
        mock_sys.platform = "darwin"
        resp = client.get("/api/autostart")
        data = resp.json()
        assert data["supported"] is False
        assert data["enabled"] is False


class TestApiAutostartEnable:
    @patch("src.dashboard_api.sys")
    def test_fails_on_non_windows(self, mock_sys, client):
        mock_sys.platform = "linux"
        resp = client.post("/api/autostart/enable")
        data = resp.json()
        assert data["success"] is False

    @patch("src.dashboard_api.sys")
    @patch("subprocess.run")
    def test_success_on_windows(self, mock_run, mock_sys, client):
        mock_sys.platform = "win32"
        mock_sys.executable = sys.executable
        mock_run.return_value = MagicMock(returncode=0, stderr="")
        with patch("shutil.which", return_value="C:\\copilot-dashboard.exe"):
            resp = client.post("/api/autostart/enable")
        data = resp.json()
        assert data["success"] is True

    @patch("src.dashboard_api.sys")
    @patch("subprocess.run")
    def test_failure_on_windows(self, mock_run, mock_sys, client):
        mock_sys.platform = "win32"
        mock_sys.executable = sys.executable
        mock_run.return_value = MagicMock(returncode=1, stderr="Access denied")
        with patch("shutil.which", return_value="C:\\copilot-dashboard.exe"):
            resp = client.post("/api/autostart/enable")
        data = resp.json()
        assert data["success"] is False
        assert "Access denied" in data["message"]
