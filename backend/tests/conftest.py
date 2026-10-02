import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Set test environment variables before importing app
TEST_DB_PATH = "./test_temp.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH}"
os.environ["DATABASE_SYNC_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["AI_PROVIDER"] = "mock"
os.environ["JWT_SECRET_KEY"] = "test-jwt-secret-key-at-least-32-characters-long"
os.environ["UPLOAD_DIRECTORY"] = "./storage/test_uploads"

from app.db.base import Base
from app.db.session import get_db, async_engine
from app.main import app
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.core.security import get_password_hash, create_access_token


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=async_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_org(db_session: AsyncSession) -> Organization:
    org = Organization(name="Test Acme Corp")
    db_session.add(org)
    await db_session.commit()
    await db_session.refresh(org)
    return org


@pytest_asyncio.fixture(scope="function")
async def test_admin(db_session: AsyncSession, test_org: Organization) -> User:
    admin = User(
        name="Admin User",
        email="admin@test.com",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.ADMIN.value,
        organization_id=test_org.id,
        is_active=True,
    )
    db_session.add(admin)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest_asyncio.fixture(scope="function")
async def test_employee(db_session: AsyncSession, test_org: Organization) -> User:
    employee = User(
        name="Employee User",
        email="employee@test.com",
        password_hash=get_password_hash("Password123!"),
        role=UserRole.EMPLOYEE.value,
        organization_id=test_org.id,
        is_active=True,
    )
    db_session.add(employee)
    await db_session.commit()
    await db_session.refresh(employee)
    return employee


@pytest.fixture
def admin_headers(test_admin: User, test_org: Organization) -> dict:
    token = create_access_token(test_admin.id, test_org.id, test_admin.role)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def employee_headers(test_employee: User, test_org: Organization) -> dict:
    token = create_access_token(test_employee.id, test_org.id, test_employee.role)
    return {"Authorization": f"Bearer {token}"}
