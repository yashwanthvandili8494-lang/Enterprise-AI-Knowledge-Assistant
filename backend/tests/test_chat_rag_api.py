import io
import pytest
from httpx import AsyncClient
from app.workers.processor import process_document_task


@pytest.mark.asyncio
async def test_chat_rag_end_to_end(client: AsyncClient, employee_headers: dict, admin_headers: dict):
    # 1. Upload and index a company policy document
    doc_content = (
        b"# ACME Remote Work Policy\n\n"
        b"Employees are permitted to work remotely up to 3 days per week with manager approval. "
        b"A home office equipment reimbursement allowance of $500 is provided annually."
    )
    files = {"file": ("remote_work_policy.txt", io.BytesIO(doc_content), "text/plain")}
    upload_res = await client.post("/api/v1/documents", headers=admin_headers, files=files, data={"category": "HR"})
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # Run processing directly to ensure chunks & vectors are indexed
    await process_document_task(doc_id)

    # 2. Create Chat Session as employee
    session_res = await client.post("/api/v1/chat/sessions", headers=employee_headers, json={"title": "Policy Inquiries"})
    assert session_res.status_code == 201
    session_id = session_res.json()["id"]

    # 3. Ask question matching document
    msg_res = await client.post(
        f"/api/v1/chat/sessions/{session_id}/messages",
        headers=employee_headers,
        json={"content": "What is the remote work policy and equipment allowance?"}
    )
    assert msg_res.status_code == 200
    msg_data = msg_res.json()
    assert msg_data["role"] == "assistant"
    # Grounded answer check
    assert "remote" in msg_data["content"].lower() or "500" in msg_data["content"]
    # Citation check
    citations = msg_data["retrieved_sources"]
    assert len(citations) >= 1
    assert citations[0]["document_name"] == "remote_work_policy.txt"
    assert citations[0]["page_number"] is not None

    # 4. Submit Feedback
    assistant_msg_id = msg_data["id"]
    fb_res = await client.post(
        f"/api/v1/chat/messages/{assistant_msg_id}/feedback",
        headers=employee_headers,
        json={"rating": 1, "comment": "Accurate and well cited!"}
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["rating"] == 1

    # 5. Ask question with NO evidence in documents
    unrelated_res = await client.post(
        f"/api/v1/chat/sessions/{session_id}/messages",
        headers=employee_headers,
        json={"content": "What is the orbital velocity of Neptune?"}
    )
    assert unrelated_res.status_code == 200
    unrelated_data = unrelated_res.json()
    # Must declare insufficient evidence
    assert "could not find the answer" in unrelated_data["content"].lower()

    # 6. Retrieve conversation history
    history_res = await client.get(f"/api/v1/chat/sessions/{session_id}", headers=employee_headers)
    assert history_res.status_code == 200
    history_data = history_res.json()
    # 2 user messages + 2 assistant messages = 4 messages
    assert len(history_data["messages"]) == 4
