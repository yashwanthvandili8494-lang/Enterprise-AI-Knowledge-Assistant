import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_upload_and_list_document(client: AsyncClient, admin_headers: dict):
    # Upload TXT file
    file_content = b"# Enterprise Security Policy\n\nAll passwords must be at least 12 characters long and rotated every 90 days."
    files = {"file": ("sec_policy.txt", io.BytesIO(file_content), "text/plain")}
    data = {"category": "Security", "tags": "security,passwords,compliance"}

    upload_res = await client.post("/api/v1/documents", headers=admin_headers, files=files, data=data)
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    assert doc_data["filename"] == "sec_policy.txt"
    assert doc_data["category"] == "Security"
    assert doc_data["status"] in ["PENDING", "PROCESSING", "COMPLETED"]
    doc_id = doc_data["id"]

    # List documents
    list_res = await client.get("/api/v1/documents", headers=admin_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(d["id"] == doc_id for d in list_data["items"])

    # Document details
    detail_res = await client.get(f"/api/v1/documents/{doc_id}", headers=admin_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == doc_id


@pytest.mark.asyncio
async def test_upload_invalid_extension(client: AsyncClient, admin_headers: dict):
    files = {"file": ("malicious.exe", io.BytesIO(b"bad binary"), "application/octet-stream")}
    res = await client.post("/api/v1/documents", headers=admin_headers, files=files)
    assert res.status_code == 400
    assert "Unsupported file format" in res.json()["detail"]


@pytest.mark.asyncio
async def test_duplicate_upload_blocked(client: AsyncClient, admin_headers: dict):
    content = b"Unique content for duplicate testing 12345"
    files = {"file": ("file1.txt", io.BytesIO(content), "text/plain")}
    res1 = await client.post("/api/v1/documents", headers=admin_headers, files=files)
    assert res1.status_code == 201

    files2 = {"file": ("file2.txt", io.BytesIO(content), "text/plain")}
    res2 = await client.post("/api/v1/documents", headers=admin_headers, files=files2)
    assert res2.status_code == 409
    assert "identical document already exists" in res2.json()["detail"]
