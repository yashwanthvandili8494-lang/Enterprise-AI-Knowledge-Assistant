import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.core.security import get_password_hash, create_access_token


@pytest.mark.asyncio
async def test_privilege_escalation_blocked(client: AsyncClient, employee_headers: dict, test_employee: User):
    # Employee attempting to change role to ADMIN
    res = await client.patch(
        f"/api/v1/users/{test_employee.id}/role",
        headers=employee_headers,
        json={"role": "ADMIN"}
    )
    # Must be forbidden
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_cross_organization_data_isolation(
    client: AsyncClient,
    db_session: AsyncSession,
    admin_headers: dict,
    test_org: Organization
):
    # Create Organization B and a user in Org B
    org_b = Organization(name="Competitor Corp")
    db_session.add(org_b)
    await db_session.flush()

    user_b = User(
        name="Spy User",
        email="spy@competitor.com",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.ADMIN.value,
        organization_id=org_b.id,
        is_active=True,
    )
    db_session.add(user_b)
    await db_session.commit()

    token_b = create_access_token(user_b.id, org_b.id, user_b.role)
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Org A lists documents - only sees Org A documents
    docs_a = await client.get("/api/v1/documents", headers=admin_headers)
    assert docs_a.status_code == 200

    # User in Org B lists documents - cannot see Org A documents
    docs_b = await client.get("/api/v1/documents", headers=headers_b)
    assert docs_b.status_code == 200
    assert docs_b.json()["total"] == 0


@pytest.mark.asyncio
async def test_cross_user_chat_session_hijacking_blocked(
    client: AsyncClient,
    employee_headers: dict,
    admin_headers: dict
):
    # Employee creates a session
    sess_res = await client.post("/api/v1/chat/sessions", headers=employee_headers, json={"title": "Private Session"})
    sess_id = sess_res.json()["id"]

    # Admin (different user) cannot access employee's private chat session
    hijack_res = await client.get(f"/api/v1/chat/sessions/{sess_id}", headers=admin_headers)
    assert hijack_res.status_code == 404
