import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base, get_db
from main import app
from auth import create_access_token

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

    def test_unauthenticated(self):
        resp = client.get("/auth/profile")
        assert resp.status_code == 401

    def test_invalid_token(self):
        resp = client.get("/auth/profile", headers={"Authorization": "Bearer invalidtoken"})
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

    def test_create_task(self, user_token):
        resp = client.post("/tasks", json={
            "title": "My task", "status": "Pending",
        }, headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "My task"
        assert data["status"] == "Pending"
        assert "id" in data

    def test_get_tasks_empty(self, user_token):
        resp = client.get("/tasks", headers={"Authorization": f"Bearer {user_token}"})
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_tasks_isolation(self, user_token, other_token):
        client.post("/tasks", json={"title": "User A task"},
                     headers={"Authorization": f"Bearer {user_token}"})

        resp_b = client.get("/tasks", headers={"Authorization": f"Bearer {other_token}"})
        assert resp_b.status_code == 200
        assert len(resp_b.json()) == 0

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
