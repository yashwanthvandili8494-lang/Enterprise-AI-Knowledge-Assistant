import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime, timezone
from sqlalchemy import select
from app.db.session import AsyncSessionLocal, init_db
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.models.document import Document, DocumentStatus
from app.core.security import get_password_hash
from app.storage.local import default_storage, calculate_checksum
from app.workers.processor import process_document_task
from app.services.audit_service import record_audit_log

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "DemoPass123!")


async def seed_data():
    """Initializes demo organization, roles, users, and policy documents."""
    print("Initializing database schema...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # Step 1: Create Organization
        org = (await db.execute(select(Organization).where(Organization.name == "Acme Enterprise"))).scalar_one_or_none()
        if not org:
            org = Organization(name="Acme Enterprise")
            db.add(org)
            await db.flush()
            print(f"Created Organization: {org.name} ({org.id})")
        else:
            print(f"Found existing Organization: {org.name} ({org.id})")

        # Step 2: Create Demo Users with three roles
        users_data = [
            {
                "name": "Sarah Connor (Admin)",
                "email": "admin@acme.com",
                "role": UserRole.ADMIN.value,
            },
            {
                "name": "Alex Vance (Knowledge Manager)",
                "email": "manager@acme.com",
                "role": UserRole.KNOWLEDGE_MANAGER.value,
            },
            {
                "name": "Gordon Freeman (Employee)",
                "email": "employee@acme.com",
                "role": UserRole.EMPLOYEE.value,
            },
        ]

        created_users = {}
        for u in users_data:
            existing = (await db.execute(select(User).where(User.email == u["email"]))).scalar_one_or_none()
            if not existing:
                new_u = User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=get_password_hash(DEMO_PASSWORD),
                    role=u["role"],
                    organization_id=org.id,
                    is_active=True,
                )
                db.add(new_u)
                await db.flush()
                created_users[u["email"]] = new_u
                print(f"Created user: {u['email']} [{u['role']}]")
            else:
                created_users[u["email"]] = existing
                print(f"User exists: {u['email']} [{existing.role}]")

        await db.commit()

        # Step 3: Seed Demo Documents
        manager_user = created_users.get("manager@acme.com") or created_users.get("admin@acme.com")
        possible_dirs = [
            Path(__file__).resolve().parent.parent.parent.parent / "demo_documents",
            Path(__file__).resolve().parent.parent.parent / "demo_documents",
            Path("demo_documents").resolve(),
            Path("../demo_documents").resolve(),
        ]
        demo_docs_dir = next((d for d in possible_dirs if d.exists()), possible_dirs[0])
        
        sample_files = [
            {
                "filename": "hr_annual_leave_policy.txt",
                "category": "Human Resources",
                "tags": ["leave", "pto", "benefits", "vacation"],
            },
            {
                "filename": "production_deployment_runbook.txt",
                "category": "Engineering Operations",
                "tags": ["deployment", "canary", "rollback", "pagerduty"],
            },
            {
                "filename": "security_incident_response_protocol.txt",
                "category": "Information Security",
                "tags": ["security", "incident", "gdpr", "sev-1", "soc"],
            },
        ]

        doc_ids_to_process = []
        for doc_info in sample_files:
            file_path = demo_docs_dir / doc_info["filename"]
            if not file_path.exists():
                print(f"Warning: Demo file not found at {file_path}")
                continue

            content_bytes = file_path.read_bytes()
            checksum = calculate_checksum(content_bytes)

            existing_doc = (await db.execute(
                select(Document).where(Document.organization_id == org.id, Document.checksum == checksum)
            )).scalar_one_or_none()

            if not existing_doc:
                storage_key = f"{org.id}/demo_{doc_info['filename']}"
                await default_storage.save_file(content_bytes, storage_key)

                new_doc = Document(
                    organization_id=org.id,
                    uploaded_by=manager_user.id if manager_user else None,
                    filename=doc_info["filename"],
                    storage_key=storage_key,
                    content_type="text/plain",
                    file_size=len(content_bytes),
                    checksum=checksum,
                    status=DocumentStatus.PENDING.value,
                    category=doc_info["category"],
                    tags=doc_info["tags"],
                    chunk_count=0,
                )
                db.add(new_doc)
                await db.commit()
                await db.refresh(new_doc)
                print(f"Uploaded demo document: {new_doc.filename}")
                doc_ids_to_process.append(new_doc.id)
            else:
                print(f"Document already exists: {existing_doc.filename}")
                if existing_doc.status != DocumentStatus.COMPLETED.value:
                    doc_ids_to_process.append(existing_doc.id)

    # Step 4: Process documents in background worker
    for d_id in doc_ids_to_process:
        print(f"Processing document indexing for: {d_id}...")
        await process_document_task(d_id)
        print(f"Document {d_id} processing complete.")

    print("\n=======================================================")
    print("Enterprise AI Knowledge Assistant Demo Seed Complete!")
    print(f"Organization: Acme Enterprise")
    print(f"Admin User:   admin@acme.com      Password: {DEMO_PASSWORD}")
    print(f"Manager User: manager@acme.com    Password: {DEMO_PASSWORD}")
    print(f"Employee:     employee@acme.com   Password: {DEMO_PASSWORD}")
    print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(seed_data())
