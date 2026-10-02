import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient):
    payload = {
        "name": "New Hire",
        "email": "newhire@example.com",
        "password": "SecurePassword123!",
        "organization_name": "NewCo Enterprise"
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "newhire@example.com"
    # First user in a new organization gets ADMIN
    assert data["user"]["role"] == "ADMIN"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "name": "Existing User",
        "email": "duplicate@example.com",
        "password": "SecurePassword123!",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    # Register first
    await client.post("/api/v1/auth/register", json={
        "name": "Login User",
        "email": "loginuser@example.com",
        "password": "MySecretPassword123!"
    })

    # Valid Login
    login_res = await client.post("/api/v1/auth/login", json={
        "email": "loginuser@example.com",
        "password": "MySecretPassword123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()
    assert "refresh_token" in login_res.json()


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "name": "Test User",
        "email": "user@example.com",
        "password": "CorrectPassword123!"
    })

    bad_login = await client.post("/api/v1/auth/login", json={
        "email": "user@example.com",
        "password": "WrongPassword!"
    })
    assert bad_login.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client: AsyncClient, employee_headers: dict):
    res = await client.get("/api/v1/auth/me", headers=employee_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "employee@test.com"
    assert data["role"] == "EMPLOYEE"


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={
        "name": "Refresh Tester",
        "email": "refreshtest@example.com",
        "password": "Password123!"
    })
    old_refresh = reg.json()["refresh_token"]

    # Rotate refresh token
    ref_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert ref_res.status_code == 200
    new_refresh = ref_res.json()["refresh_token"]
    assert new_refresh != old_refresh

    # Using the old refresh token again must fail (revoked!)
    fail_res = await client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert fail_res.status_code == 401
