import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_seed_accounts_login_admin():
    res = client.post("/api/v1/auth/login", json={
        "email": "admin@acnevision.test",
        "password": "admin12345"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "admin@acnevision.test"
    assert data["user"]["role"] == "admin"


def test_seed_accounts_login_demo_user():
    res = client.post("/api/v1/auth/login", json={
        "email": "demo@acnevision.test",
        "password": "demo12345"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "demo@acnevision.test"
    assert data["user"]["role"] == "user"


def test_seed_accounts_login_pasien():
    res = client.post("/api/v1/auth/login", json={
        "email": "pasien@acnevision.test",
        "password": "pasien12345"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["full_name"] == "Siti Nurhaliza (Pasien)"


def test_invalid_login_credentials():
    res = client.post("/api/v1/auth/login", json={
        "email": "demo@acnevision.test",
        "password": "wrongpassword"
    })
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_user_registration_and_profile_flow():
    reg_res = client.post("/api/v1/auth/register", json={
        "email": "newuser@acnevision.test",
        "password": "securepassword123",
        "full_name": "New User AcneVision"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    token = reg_data["access_token"]
    assert reg_data["user"]["full_name"] == "New User AcneVision"

    # Profile (GET /me)
    headers = {"Authorization": f"Bearer {token}"}
    me_res = client.get("/api/v1/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "newuser@acnevision.test"

    # Update Profile (PATCH /me)
    patch_res = client.patch("/api/v1/me", json={"full_name": "Updated Name"}, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["full_name"] == "Updated Name"

    # Duplicate registration should be rejected
    dup_res = client.post("/api/v1/auth/register", json={
        "email": "newuser@acnevision.test",
        "password": "securepassword123",
        "full_name": "New User AcneVision"
    })
    assert dup_res.status_code == 400
    assert dup_res.json()["error"]["code"] == "EMAIL_ALREADY_EXISTS"


def test_admin_access_control():
    # Login as regular user
    user_res = client.post("/api/v1/auth/login", json={
        "email": "demo@acnevision.test",
        "password": "demo12345"
    }).json()
    user_headers = {"Authorization": f"Bearer {user_res['access_token']}"}

    # Regular user attempting admin route -> 403 Forbidden
    forbidden_res = client.get("/api/v1/admin/users", headers=user_headers)
    assert forbidden_res.status_code == 403

    # Login as Admin
    admin_res = client.post("/api/v1/auth/login", json={
        "email": "admin@acnevision.test",
        "password": "admin12345"
    }).json()
    admin_headers = {"Authorization": f"Bearer {admin_res['access_token']}"}

    # Admin accessing admin route -> 200 OK
    admin_users_res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert admin_users_res.status_code == 200
    data = admin_users_res.json()
    assert "items" in data
    assert data["total"] >= 3

