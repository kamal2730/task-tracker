import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from auth import create_access_token
from models import UserModel

TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    client.cookies.clear()
    yield
    Base.metadata.drop_all(bind=engine)


def register_user(email="test@example.com", name="Test User", password="secret123"):
    return client.post("/auth/register", json={
        "email": email, "name": name, "password": password,
    })


def login_user(email="test@example.com", password="secret123"):
    return client.post("/auth/login", json={
        "email": email, "password": password,
    })


def get_tasks(token):
    return client.get("/tasks", headers={"Authorization": f"Bearer {token}"})


def get_task_ids(token):
    return [t["id"] for t in get_tasks(token).json()["items"]]


# ─── Auth: Registration ────────────────────────────────


class TestRegister:
    def test_success(self):
        resp = register_user()
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["name"] == "Test User"
        assert data["user"]["role"] == "User"
        assert "id" in data["user"]

    def test_duplicate_email(self):
        register_user()
        resp = register_user()
        assert resp.status_code == 409
        assert "already registered" in resp.json()["detail"].lower()


# ─── Auth: Login ────────────────────────────────────────


class TestLogin:
    def test_success(self):
        register_user()
        resp = login_user()
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"
        assert data["user"]["role"] == "User"

    def test_wrong_password(self):
        register_user()
        resp = login_user(password="wrongpass")
        assert resp.status_code == 401

    def test_nonexistent_email(self):
        resp = login_user(email="nobody@example.com")
        assert resp.status_code == 401


# ─── Auth: Profile ──────────────────────────────────────


class TestProfile:
    def test_authenticated(self):
        reg = register_user()
        token = reg.json()["access_token"]
        resp = client.get("/auth/profile", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"
        assert resp.json()["role"] == "User"

    def test_unauthenticated(self):
        resp = client.get("/auth/profile")
        assert resp.status_code == 401

    def test_invalid_token(self):
        resp = client.get("/auth/profile", headers={"Authorization": "Bearer invalidtoken"})
        assert resp.status_code == 401


# ─── Auth: Refresh ─────────────────────────────────────


class TestRefresh:
    def test_refresh_token(self):
        reg = register_user()
        token = reg.json()["access_token"]
        cookies = reg.cookies
        resp = client.post("/auth/refresh", cookies=cookies,
                           headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"

    def test_refresh_without_cookie(self):
        client.cookies.clear()
        resp = client.post("/auth/refresh")
        assert resp.status_code == 401

    def test_refresh_with_bad_cookie(self):
        client.cookies.clear()
        client.cookies.set("refresh_token", "invalid")
        resp = client.post("/auth/refresh")
        assert resp.status_code == 401


# ─── Tasks: CRUD ────────────────────────────────────────


class TestTasks:
    @pytest.fixture
    def user_token(self):
        reg = register_user()
        return reg.json()["access_token"]

    @pytest.fixture
    def other_token(self):
        reg = register_user("other@example.com", "Other User", "pass456")
        return reg.json()["access_token"]

    def _get_tasks_json(self, token):
        return client.get("/tasks", headers={"Authorization": f"Bearer {token}"}).json()

    def test_create_task(self, user_token):
        resp = client.post("/tasks", json={
            "title": "My task", "status": "Pending",
        }, headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "My task"
        assert data["status"] == "Pending"
        assert "id" in data
        assert data["assigned_to"] is None

    def test_get_tasks_empty(self, user_token):
        resp = client.get("/tasks", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["pages"] == 1

    def test_get_tasks_isolation(self, user_token, other_token):
        client.post("/tasks", json={"title": "User A task"},
                     headers={"Authorization": f"Bearer {user_token}"})

        resp_b = client.get("/tasks", headers={"Authorization": f"Bearer {other_token}"})
        assert resp_b.status_code == 200
        assert len(resp_b.json()["items"]) == 0

    def test_update_task(self, user_token):
        create = client.post("/tasks", json={"title": "Old title"},
                             headers={"Authorization": f"Bearer {user_token}"})
        task_id = create.json()["id"]

        resp = client.put(f"/tasks/{task_id}", json={"title": "New title"},
                          headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        assert resp.json()["title"] == "New title"

    def test_update_other_user_task(self, user_token, other_token):
        create = client.post("/tasks", json={"title": "User A task"},
                             headers={"Authorization": f"Bearer {user_token}"})
        task_id = create.json()["id"]

        resp = client.put(f"/tasks/{task_id}", json={"title": "Hacked"},
                          headers={"Authorization": f"Bearer {other_token}"})
        assert resp.status_code == 404

    def test_delete_task(self, user_token):
        create = client.post("/tasks", json={"title": "To delete"},
                             headers={"Authorization": f"Bearer {user_token}"})
        task_id = create.json()["id"]

        resp = client.delete(f"/tasks/{task_id}",
                             headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 204

    def test_delete_other_user_task(self, user_token, other_token):
        create = client.post("/tasks", json={"title": "User A task"},
                             headers={"Authorization": f"Bearer {user_token}"})
        task_id = create.json()["id"]

        resp = client.delete(f"/tasks/{task_id}",
                             headers={"Authorization": f"Bearer {other_token}"})
        assert resp.status_code == 404

    def test_unauthenticated_crud(self):
        assert client.get("/tasks").status_code == 401
        assert client.post("/tasks", json={"title": "x"}).status_code == 401
        assert client.put("/tasks/some-id", json={"title": "x"}).status_code == 401
        assert client.delete("/tasks/some-id").status_code == 401

    def test_token_from_wrong_user(self):
        token = create_access_token("nonexistent-user-id")
        resp = client.get("/tasks", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 401
        assert "user not found" in resp.json()["detail"].lower()

    def test_pagination(self, user_token):
        for i in range(5):
            client.post("/tasks", json={"title": f"Task {i}"},
                        headers={"Authorization": f"Bearer {user_token}"})
        resp = client.get("/tasks?page=1&limit=2",
                          headers={"Authorization": f"Bearer {user_token}"})
        data = resp.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["page"] == 1
        assert data["pages"] == 3

    def test_sort_by_title(self, user_token):
        titles = ["C task", "A task", "B task"]
        for t in titles:
            client.post("/tasks", json={"title": t},
                        headers={"Authorization": f"Bearer {user_token}"})
        resp = client.get("/tasks?sort_by=title&sort_order=asc",
                          headers={"Authorization": f"Bearer {user_token}"})
        items = resp.json()["items"]
        assert [i["title"] for i in items] == sorted(titles)

    def test_sort_by_created_at(self, user_token):
        from datetime import datetime, timedelta, timezone
        from models import TaskModel
        db = TestingSessionLocal()
        try:
            user = db.query(UserModel).first()
            now = datetime.now(timezone.utc)
            tasks = [
                TaskModel(title="Oldest",  user_id=user.id, createdAt=(now - timedelta(hours=2)).isoformat()),
                TaskModel(title="Middle",  user_id=user.id, createdAt=(now - timedelta(hours=1)).isoformat()),
                TaskModel(title="Newest",  user_id=user.id, createdAt=now.isoformat()),
            ]
            db.add_all(tasks)
            db.commit()
        finally:
            db.close()

        resp = client.get("/tasks?sort_by=createdAt&sort_order=asc",
                          headers={"Authorization": f"Bearer {user_token}"})
        items = resp.json()["items"]
        titles_asc = [i["title"] for i in items if i["title"] in ("Oldest", "Middle", "Newest")]
        assert titles_asc == ["Oldest", "Middle", "Newest"]

        resp = client.get("/tasks?sort_by=createdAt&sort_order=desc",
                          headers={"Authorization": f"Bearer {user_token}"})
        items = resp.json()["items"]
        titles_desc = [i["title"] for i in items if i["title"] in ("Oldest", "Middle", "Newest")]
        assert titles_desc == ["Newest", "Middle", "Oldest"]

    def test_search(self, user_token):
        client.post("/tasks", json={"title": "alpha"},
                    headers={"Authorization": f"Bearer {user_token}"})
        client.post("/tasks", json={"title": "beta"},
                    headers={"Authorization": f"Bearer {user_token}"})
        resp = client.get("/tasks?q=alpha",
                          headers={"Authorization": f"Bearer {user_token}"})
        assert len(resp.json()["items"]) == 1


# ─── RBAC ──────────────────────────────────────────────


class TestRBAC:
    @pytest.fixture
    def user_token(self):
        reg = register_user()
        return reg.json()["access_token"]

    @pytest.fixture
    def admin_token(self):
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        admin = UserModel(
            name="Admin", email="admin@test.com",
            hashed_password="$2b$12$LJ3m4ys3Lk0TSwHnbfOMkO3p0Q6Mn7sMqb5nEEq0p0Q6Mn7sMqb5n",
            role="Admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        db.close()
        token = create_access_token(admin.id)
        return token, admin.id

    def test_admin_list_users(self, admin_token):
        token, _ = admin_token
        resp = client.get("/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_user_cannot_list_users(self, user_token):
        resp = client.get("/users", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 403

    def test_manager_can_list_users(self):
        reg = register_user("mgr@test.com", "Manager", "pass123")
        db = TestingSessionLocal()
        user = db.query(UserModel).filter(UserModel.email == "mgr@test.com").first()
        user.role = "Manager"
        db.commit()
        db.close()
        token = reg.json()["access_token"]
        resp = client.get("/users", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200


# ─── Comments ──────────────────────────────────────────


class TestComments:
    @pytest.fixture
    def user_token(self):
        reg = register_user()
        return reg.json()["access_token"]

    def test_add_comment(self, user_token):
        task = client.post("/tasks", json={"title": "Test"},
                           headers={"Authorization": f"Bearer {user_token}"}).json()
        resp = client.post(f"/tasks/{task['id']}/comments",
                           json={"content": "Nice task!"},
                           headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 201
        assert resp.json()["content"] == "Nice task!"
        assert resp.json()["user_name"] == "Test User"

    def test_list_comments(self, user_token):
        task = client.post("/tasks", json={"title": "Test"},
                           headers={"Authorization": f"Bearer {user_token}"}).json()
        client.post(f"/tasks/{task['id']}/comments", json={"content": "First"},
                    headers={"Authorization": f"Bearer {user_token}"})
        client.post(f"/tasks/{task['id']}/comments", json={"content": "Second"},
                    headers={"Authorization": f"Bearer {user_token}"})
        resp = client.get(f"/tasks/{task['id']}/comments",
                          headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_delete_own_comment(self, user_token):
        task = client.post("/tasks", json={"title": "Test"},
                           headers={"Authorization": f"Bearer {user_token}"}).json()
        comment = client.post(f"/tasks/{task['id']}/comments", json={"content": "Delete me"},
                              headers={"Authorization": f"Bearer {user_token}"}).json()
        resp = client.delete(f"/comments/{comment['id']}",
                             headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 204

    def test_cannot_delete_others_comment(self, user_token):
        reg2 = register_user("other2@test.com", "Other", "pass123")
        token2 = reg2.json()["access_token"]
        task = client.post("/tasks", json={"title": "Test"},
                           headers={"Authorization": f"Bearer {user_token}"}).json()
        comment = client.post(f"/tasks/{task['id']}/comments", json={"content": "Mine"},
                              headers={"Authorization": f"Bearer {user_token}"}).json()
        resp = client.delete(f"/comments/{comment['id']}",
                             headers={"Authorization": f"Bearer {token2}"})
        assert resp.status_code == 403


# ─── Activity ───────────────────────────────────────────


class TestActivity:
    @pytest.fixture
    def user_token(self):
        reg = register_user()
        return reg.json()["access_token"]

    def test_activity_after_create(self, user_token):
        task = client.post("/tasks", json={"title": "New task"},
                           headers={"Authorization": f"Bearer {user_token}"}).json()
        resp = client.get(f"/tasks/{task['id']}/activity",
                          headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        actions = [a["action"] for a in resp.json()]
        assert "task.created" in actions

    def test_activity_after_update(self, user_token):
        task = client.post("/tasks", json={"title": "Original"},
                           headers={"Authorization": f"Bearer {user_token}"}).json()
        client.put(f"/tasks/{task['id']}", json={"title": "Updated"},
                   headers={"Authorization": f"Bearer {user_token}"})
        resp = client.get(f"/tasks/{task['id']}/activity",
                          headers={"Authorization": f"Bearer {user_token}"})
        actions = [a["action"] for a in resp.json()]
        assert "task.created" in actions
        assert "task.updated" in actions


# ─── Task Assignment ────────────────────────────────────


class TestAssignment:
    @pytest.fixture
    def user_token(self):
        reg = register_user()
        return reg.json()["access_token"]

    @pytest.fixture
    def admin_token(self):
        db = TestingSessionLocal()
        admin = UserModel(
            name="Admin", email="admin2@test.com",
            hashed_password="$2b$12$LJ3m4ys3Lk0TSwHnbfOMkO3p0Q6Mn7sMqb5nEEq0p0Q6Mn7sMqb5n",
            role="Admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        db.close()
        return create_access_token(admin.id)

    def test_admin_assign_task(self, admin_token):
        task = client.post("/tasks", json={"title": "Assignable"},
                           headers={"Authorization": f"Bearer {admin_token}"}).json()
        db = TestingSessionLocal()
        user = UserModel(name="Target", email="target@test.com",
                         hashed_password="dummy")
        db.add(user)
        db.commit()
        target_id = user.id
        db.close()

        resp = client.patch(f"/tasks/{task['id']}/assign",
                            json={"assigned_to": target_id},
                            headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert resp.json()["assigned_to"] == target_id

    def test_user_cannot_assign(self, user_token):
        db = TestingSessionLocal()
        db.add(UserModel(name="Target", email="t2@test.com",
                         hashed_password="dummy"))
        db.commit()
        db.close()
        resp = client.patch("/tasks/some-id/assign",
                            json={"assigned_to": "some-id"},
                            headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 403


# ─── Team CRUD ──────────────────────────────────────────


class TestTeams:
    @pytest.fixture
    def admin_token(self):
        db = TestingSessionLocal()
        admin = UserModel(
            name="Admin", email="team-admin@test.com",
            hashed_password="dummy",
            role="Admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        db.close()
        return create_access_token(admin.id)

    def test_create_team(self, admin_token):
        resp = client.post("/teams", json={"name": "Alpha"},
                           headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Alpha"
        assert "id" in data

    def test_list_teams(self, admin_token):
        client.post("/teams", json={"name": "Alpha"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        client.post("/teams", json={"name": "Beta"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        resp = client.get("/teams", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_update_team(self, admin_token):
        created = client.post("/teams", json={"name": "Old"},
                              headers={"Authorization": f"Bearer {admin_token}"}).json()
        resp = client.patch(f"/teams/{created['id']}", json={"name": "Renamed"},
                            headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Renamed"

    def test_delete_team(self, admin_token):
        created = client.post("/teams", json={"name": "Temp"},
                              headers={"Authorization": f"Bearer {admin_token}"}).json()
        resp = client.delete(f"/teams/{created['id']}",
                             headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 204

    def test_user_cannot_manage_teams(self):
        reg = register_user()
        token = reg.json()["access_token"]
        assert client.post("/teams", json={"name": "X"},
                           headers={"Authorization": f"Bearer {token}"}).status_code == 403
        assert client.get("/teams",
                          headers={"Authorization": f"Bearer {token}"}).status_code == 403


# ─── Manager Team Scoping ───────────────────────────────


class TestManagerTeamScoping:
    @pytest.fixture
    def admin_token(self):
        db = TestingSessionLocal()
        admin = UserModel(
            name="Admin", email="scope-admin@test.com",
            hashed_password="dummy", role="Admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        db.close()
        return create_access_token(admin.id)

    def test_manager_sees_only_team_tasks(self, admin_token):
        # Create two teams
        team_a = client.post("/teams", json={"name": "Team A"},
                             headers={"Authorization": f"Bearer {admin_token}"}).json()
        team_b = client.post("/teams", json={"name": "Team B"},
                             headers={"Authorization": f"Bearer {admin_token}"}).json()

        db = TestingSessionLocal()

        # Manager in Team A
        mgr = UserModel(name="Manager A", email="mgr-a@test.com",
                        hashed_password="dummy", role="Manager", team_id=team_a["id"])
        db.add(mgr)

        # Two users in Team A
        user_a1 = UserModel(name="User A1", email="ua1@test.com",
                            hashed_password="dummy", role="User", team_id=team_a["id"])
        user_a2 = UserModel(name="User A2", email="ua2@test.com",
                            hashed_password="dummy", role="User", team_id=team_a["id"])
        db.add(user_a1)
        db.add(user_a2)

        # User in Team B
        user_b = UserModel(name="User B", email="ub@test.com",
                           hashed_password="dummy", role="User", team_id=team_b["id"])
        db.add(user_b)

        db.commit()

        mgr_token = create_access_token(mgr.id)
        user_a1_token = create_access_token(user_a1.id)
        user_b_token = create_access_token(user_b.id)

        # Admin creates tasks for Team A users and Team B user
        for uid in [user_a1.id, user_a2.id, user_b.id]:
            task_resp = client.post(
                "/tasks", json={"title": f"Task for {uid}"},
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            task_id = task_resp.json()["id"]
            client.patch(f"/tasks/{task_id}/assign", json={"assigned_to": uid},
                         headers={"Authorization": f"Bearer {admin_token}"})

        db.close()

        # Manager A should see only Team A tasks (2)
        mgr_tasks = client.get("/tasks", headers={"Authorization": f"Bearer {mgr_token}"}).json()
        assert mgr_tasks["total"] == 2

        # User B should see only their task (1)
        user_b_tasks = client.get("/tasks", headers={"Authorization": f"Bearer {user_b_token}"}).json()
        assert user_b_tasks["total"] == 1

    def test_manager_no_team_sees_no_tasks(self, admin_token):
        db = TestingSessionLocal()
        mgr = UserModel(name="Mgr No Team", email="mgr-no-team@test.com",
                        hashed_password="dummy", role="Manager")
        db.add(mgr)
        db.commit()
        db.refresh(mgr)
        mgr_id = mgr.id
        db.close()

        # Admin creates a task
        client.post("/tasks", json={"title": "Some task"},
                    headers={"Authorization": f"Bearer {admin_token}"})

        mgr_token = create_access_token(mgr.id)
        resp = client.get("/tasks", headers={"Authorization": f"Bearer {mgr_token}"})
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_manager_assign_within_team(self, admin_token):
        team = client.post("/teams", json={"name": "Assign Team"},
                           headers={"Authorization": f"Bearer {admin_token}"}).json()
        db = TestingSessionLocal()
        mgr = UserModel(name="Mgr Assign", email="mgr-assign@test.com",
                        hashed_password="dummy", role="Manager", team_id=team["id"])
        target = UserModel(name="Target", email="target-assign@test.com",
                           hashed_password="dummy", role="User", team_id=team["id"])
        db.add(mgr)
        db.add(target)
        db.commit()
        target_id = target.id
        mgr_token = create_access_token(mgr.id)
        db.close()

        task = client.post("/tasks", json={"title": "Assign test"},
                           headers={"Authorization": f"Bearer {mgr_token}"}).json()
        resp = client.patch(f"/tasks/{task['id']}/assign", json={"assigned_to": target_id},
                            headers={"Authorization": f"Bearer {mgr_token}"})
        assert resp.status_code == 200
        assert resp.json()["assigned_to"] == target_id

    def test_manager_cannot_assign_outside_team(self, admin_token):
        team_a = client.post("/teams", json={"name": "ATeam"},
                             headers={"Authorization": f"Bearer {admin_token}"}).json()
        team_b = client.post("/teams", json={"name": "BTeam"},
                             headers={"Authorization": f"Bearer {admin_token}"}).json()
        db = TestingSessionLocal()
        mgr = UserModel(name="Mgr Outside", email="mgr-outside@test.com",
                        hashed_password="dummy", role="Manager", team_id=team_a["id"])
        outsider = UserModel(name="Outsider", email="outsider@test.com",
                             hashed_password="dummy", role="User", team_id=team_b["id"])
        db.add(mgr)
        db.add(outsider)
        db.commit()
        db.refresh(mgr)
        db.refresh(outsider)
        mgr_token = create_access_token(mgr.id)
        outsider_id = outsider.id
        db.close()

        task = client.post("/tasks", json={"title": "Cross-team assign"},
                           headers={"Authorization": f"Bearer {mgr_token}"}).json()
        resp = client.patch(f"/tasks/{task['id']}/assign", json={"assigned_to": outsider_id},
                            headers={"Authorization": f"Bearer {mgr_token}"})
        assert resp.status_code == 400
        assert "your team" in resp.json()["detail"].lower()

    def test_manager_no_team_cannot_assign(self, admin_token):
        db = TestingSessionLocal()
        mgr = UserModel(name="Mgr NoTeam", email="mgr-no-team-assign@test.com",
                        hashed_password="dummy", role="Manager")
        db.add(mgr)
        db.commit()
        db.refresh(mgr)
        mgr_token = create_access_token(mgr.id)
        db.close()

        task = client.post("/tasks", json={"title": "No team assign"},
                           headers={"Authorization": f"Bearer {admin_token}"}).json()
        resp = client.patch(f"/tasks/{task['id']}/assign", json={"assigned_to": "some-id"},
                            headers={"Authorization": f"Bearer {mgr_token}"})
        # Manager without a team sees no tasks → task not found
        assert resp.status_code == 404


# ─── Pagination & Stats ─────────────────────────────────


class TestStats:
    @pytest.fixture
    def user_token(self):
        reg = register_user()
        return reg.json()["access_token"]

    def test_stats(self, user_token):
        client.post("/tasks", json={"title": "T1", "priority": "High"},
                    headers={"Authorization": f"Bearer {user_token}"})
        client.post("/tasks", json={"title": "T2", "priority": "Low"},
                    headers={"Authorization": f"Bearer {user_token}"})
        client.post("/tasks", json={"title": "T3", "status": "Done", "priority": "Medium"},
                    headers={"Authorization": f"Bearer {user_token}"})
        resp = client.get("/tasks/stats",
                          headers={"Authorization": f"Bearer {user_token}"})
        data = resp.json()
        assert data["total"] == 3
        assert data["byStatus"]["Done"] == 1
        assert data["byPriority"]["High"] == 1
        assert data["byPriority"]["Low"] == 1


# ─── Notifications ───────────────────────────────────────


class TestNotifications:
    @pytest.fixture
    def user_token(self):
        reg = register_user()
        return reg.json()["access_token"]

    @pytest.fixture
    def other_token(self):
        reg = register_user(email="other@test.com", name="Other User")
        return reg.json()["access_token"]

    @pytest.fixture
    def admin_token(self):
        db = TestingSessionLocal()
        admin = UserModel(
            name="Admin", email="admin@test.com",
            hashed_password="dummy", role="Admin",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        db.close()
        return create_access_token(admin.id)

    def _get_id(self, token):
        return client.get("/auth/profile", headers={"Authorization": f"Bearer {token}"}).json()["id"]

    def test_notifications_on_task_create_with_assignee(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        client.post("/tasks", json={"title": "Assigned Task", "assigned_to": other_id},
                    headers={"Authorization": f"Bearer {admin_token}"})
        resp = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"})
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["type"] == "TASK_CREATED"
        assert data["items"][0]["task_id"] is not None

    def test_notifications_on_task_assignment(self, admin_token, other_token):
        task = client.post("/tasks", json={"title": "To Assign"},
                           headers={"Authorization": f"Bearer {admin_token}"}).json()
        other_id = self._get_id(other_token)
        client.patch(f"/tasks/{task['id']}/assign", json={"assigned_to": other_id},
                     headers={"Authorization": f"Bearer {admin_token}"})
        resp = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"})
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["type"] == "TASK_ASSIGNED"

    def test_notifications_on_status_change(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        task = client.post("/tasks", json={"title": "Status Task", "assigned_to": other_id},
                           headers={"Authorization": f"Bearer {admin_token}"}).json()
        client.put(f"/tasks/{task['id']}", json={"status": "Done"},
                   headers={"Authorization": f"Bearer {admin_token}"})
        resp_creator = client.get("/notifications", headers={"Authorization": f"Bearer {admin_token}"})
        resp_assignee = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"})
        assert resp_creator.json()["total"] == 0
        types = [n["type"] for n in resp_assignee.json()["items"]]
        assert "STATUS_CHANGED" in types

    def test_notifications_on_comment(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        task = client.post("/tasks", json={"title": "Comment Task", "assigned_to": other_id},
                           headers={"Authorization": f"Bearer {admin_token}"}).json()
        client.post(f"/tasks/{task['id']}/comments", json={"content": "Nice work"},
                    headers={"Authorization": f"Bearer {other_token}"})
        resp_creator = client.get("/notifications", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp_creator.json()["total"] == 1
        assert resp_creator.json()["items"][0]["type"] == "COMMENT_ADDED"
        assert "Other User" in resp_creator.json()["items"][0]["message"]

    def test_no_self_notification_on_comment(self, admin_token):
        task = client.post("/tasks", json={"title": "Self Comment"},
                           headers={"Authorization": f"Bearer {admin_token}"}).json()
        client.post(f"/tasks/{task['id']}/comments", json={"content": "Self note"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        resp = client.get("/notifications", headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.json()["total"] == 0

    def test_no_duplicate_notifications(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        task = client.post("/tasks", json={"title": "Dup Task"},
                           headers={"Authorization": f"Bearer {admin_token}"}).json()
        client.patch(f"/tasks/{task['id']}/assign", json={"assigned_to": other_id},
                     headers={"Authorization": f"Bearer {admin_token}"})
        client.patch(f"/tasks/{task['id']}/assign", json={"assigned_to": other_id},
                     headers={"Authorization": f"Bearer {admin_token}"})
        resp = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"})
        assert resp.json()["total"] == 1

    def test_get_notifications_only_own(self, admin_token, other_token):
        client.post("/tasks", json={"title": "My Task"},
                    headers={"Authorization": f"Bearer {admin_token}"})
        resp = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"})
        assert resp.json()["total"] == 0

    def test_mark_notification_read(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        client.post("/tasks", json={"title": "Read Task", "assigned_to": other_id},
                    headers={"Authorization": f"Bearer {admin_token}"})
        notifs = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"}).json()
        notif_id = notifs["items"][0]["id"]
        resp = client.patch(f"/notifications/{notif_id}/read",
                            headers={"Authorization": f"Bearer {other_token}"})
        assert resp.status_code == 200
        notifs_after = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"}).json()
        assert notifs_after["items"][0]["is_read"] is True

    def test_cannot_mark_others_read(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        client.post("/tasks", json={"title": "Other Read", "assigned_to": other_id},
                    headers={"Authorization": f"Bearer {admin_token}"})
        notifs = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"}).json()
        notif_id = notifs["items"][0]["id"]
        resp = client.patch(f"/notifications/{notif_id}/read",
                            headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 403

    def test_mark_all_read(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        client.post("/tasks", json={"title": "All Read 1", "assigned_to": other_id},
                    headers={"Authorization": f"Bearer {admin_token}"})
        client.post("/tasks", json={"title": "All Read 2", "assigned_to": other_id},
                    headers={"Authorization": f"Bearer {admin_token}"})
        resp = client.patch("/notifications/read-all",
                            headers={"Authorization": f"Bearer {other_token}"})
        assert resp.status_code == 200
        notifs = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"}).json()
        assert all(n["is_read"] is True for n in notifs["items"])

    def test_delete_notification(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        client.post("/tasks", json={"title": "Del Notif", "assigned_to": other_id},
                    headers={"Authorization": f"Bearer {admin_token}"})
        notifs = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"}).json()
        notif_id = notifs["items"][0]["id"]
        resp = client.delete(f"/notifications/{notif_id}",
                             headers={"Authorization": f"Bearer {other_token}"})
        assert resp.status_code == 204
        notifs_after = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"}).json()
        assert notifs_after["total"] == 0

    def test_cannot_delete_others_notification(self, admin_token, other_token):
        other_id = self._get_id(other_token)
        client.post("/tasks", json={"title": "Del Other", "assigned_to": other_id},
                    headers={"Authorization": f"Bearer {admin_token}"})
        notifs = client.get("/notifications", headers={"Authorization": f"Bearer {other_token}"}).json()
        notif_id = notifs["items"][0]["id"]
        resp = client.delete(f"/notifications/{notif_id}",
                             headers={"Authorization": f"Bearer {admin_token}"})
        assert resp.status_code == 403

    def test_unauthenticated_notifications(self):
        resp = client.get("/notifications")
        assert resp.status_code == 401
