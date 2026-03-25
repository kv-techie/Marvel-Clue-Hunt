import json
from datetime import datetime, timedelta

import pytest
from app.main import app
from app.models import Team
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def isolated_state(tmp_path, monkeypatch):
    import app.routes.admin as admin_module
    import app.routes.common as common_module

    game_state_file = tmp_path / "game_state.json"
    teams_file = tmp_path / "teams.json"
    devices_file = tmp_path / "devices.json"
    admin_credentials_file = tmp_path / "admin_credentials.json"
    volunteer_credentials_file = tmp_path / "volunteer_credentials.json"
    admin_whitelist_file = tmp_path / "admin_whitelist.json"
    volunteer_whitelist_file = tmp_path / "volunteer_whitelist.json"

    game_state_file.write_text(
        json.dumps({"global_start_time": None, "game_active": False, "teams": {}})
    )
    teams_file.write_text(json.dumps({}))
    devices_file.write_text(json.dumps({}))
    admin_credentials_file.write_text(json.dumps({}))
    volunteer_credentials_file.write_text(json.dumps({}))
    admin_whitelist_file.write_text(json.dumps({"admins": []}))
    volunteer_whitelist_file.write_text(json.dumps({"volunteers": []}))

    monkeypatch.setattr(admin_module, "GAME_STATE_FILE", str(game_state_file))
    monkeypatch.setattr(admin_module, "TEAMS_FILE", str(teams_file))
    monkeypatch.setattr(
        admin_module, "ADMIN_CREDENTIALS_FILE", str(admin_credentials_file)
    )
    monkeypatch.setattr(
        admin_module, "VOLUNTEER_CREDENTIALS_FILE", str(volunteer_credentials_file)
    )
    monkeypatch.setattr(admin_module, "ADMIN_WHITELIST_FILE", str(admin_whitelist_file))
    monkeypatch.setattr(
        admin_module, "VOLUNTEER_WHITELIST_FILE", str(volunteer_whitelist_file)
    )

    monkeypatch.setattr(common_module, "GAME_STATE_FILE", str(game_state_file))
    monkeypatch.setattr(common_module, "TEAMS_FILE", str(teams_file))
    monkeypatch.setattr(common_module, "DEVICES_FILE", str(devices_file))
    monkeypatch.setattr(
        common_module, "ADMIN_CREDENTIALS_FILE", str(admin_credentials_file)
    )
    monkeypatch.setattr(
        common_module, "VOLUNTEER_CREDENTIALS_FILE", str(volunteer_credentials_file)
    )
    monkeypatch.setattr(
        common_module, "ADMIN_WHITELIST_FILE", str(admin_whitelist_file)
    )
    monkeypatch.setattr(
        common_module, "VOLUNTEER_WHITELIST_FILE", str(volunteer_whitelist_file)
    )

    return {
        "game_state_file": game_state_file,
        "teams_file": teams_file,
        "devices_file": devices_file,
    }


@pytest.fixture
def seeded_question_game(monkeypatch):
    import app.powerup_manager as powerup_module
    import app.routes.admin as admin_module
    import app.routes.attendee as attendee_module
    from app.timer_manager import timer_manager

    now = datetime.now()
    admin_module.game_state.game_active = True
    admin_module.game_state.global_start_time = now
    timer_manager.set_global_start_time(now)
    admin_module.game_state.teams = {
        "Team A": Team(
            name="Team A",
            members=["A1", "A2"],
            stone="Mind Stone",
            timer_started=now - timedelta(seconds=30),
        ),
        "Team B": Team(
            name="Team B",
            members=["B1", "B2"],
            stone="Power Stone",
            timer_started=now - timedelta(seconds=30),
        ),
    }

    def fake_get_question(question_id):
        return {
            "id": question_id,
            "question_text": "Q",
            "clue_1": "c1",
            "clue_2": "c2",
            "difficulty": "easy",
            "base_points": 100,
        }

    monkeypatch.setattr(
        attendee_module.question_manager, "get_question", fake_get_question
    )
    monkeypatch.setattr(
        attendee_module.question_manager,
        "validate_answer",
        lambda qid, ans: ans == "correct",
    )
    monkeypatch.setattr(
        attendee_module, "evaluate_achievements", lambda team_dict, question_data: []
    )
    monkeypatch.setattr(attendee_module, "update_team_stats", lambda team: None)
    monkeypatch.setattr(
        powerup_module.powerup_manager,
        "get_team_powerups",
        lambda team_name: [
            {"id": "p1", "name": "P1"},
            {"id": "p2", "name": "P2"},
            {"id": "p3", "name": "P3"},
        ],
    )

    return admin_module.game_state
