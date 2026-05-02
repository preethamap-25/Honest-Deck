"""
pytest test suite — run with: pytest tests/ -v
Requires: pip install pytest pytest-asyncio httpx
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.config import settings
from app.core.security import hash_password


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def auth_headers(client):
    # Override password hash with a known value for tests
    settings.ADMIN_PASSWORD_HASH = hash_password("testpassword123!")
    resp = await client.post("/api/v1/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": "testpassword123!",
    })
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Auth tests ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_login_success(client):
    settings.ADMIN_PASSWORD_HASH = hash_password("testpassword123!")
    resp = await client.post("/api/v1/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": "testpassword123!",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    resp = await client.post("/api/v1/auth/login", json={
        "username": settings.ADMIN_USERNAME,
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me(client, auth_headers):
    resp = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == settings.ADMIN_USERNAME


@pytest.mark.asyncio
async def test_protected_without_token(client):
    resp = await client.get("/api/v1/claims/")
    assert resp.status_code == 401


# ── Claims tests ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_submit_claim(client, auth_headers):
    resp = await client.post("/api/v1/claims/", headers=auth_headers, json={
        "text": "The Earth is flat and NASA is lying about it.",
        "source": "api",
        "priority": 5,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "pending"
    assert "id" in data
    return data["id"]


@pytest.mark.asyncio
async def test_submit_claim_too_short(client, auth_headers):
    resp = await client.post("/api/v1/claims/", headers=auth_headers, json={
        "text": "Short",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_claims(client, auth_headers):
    resp = await client.get("/api/v1/claims/", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_get_nonexistent_claim(client, auth_headers):
    resp = await client.get("/api/v1/claims/000000000000000000000000", headers=auth_headers)
    assert resp.status_code == 404


# ── Admin tests ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_stats(client, auth_headers):
    resp = await client.get("/api/v1/admin/stats", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_claims" in data
    assert "queue" in data
