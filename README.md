# Enterprise AI Knowledge Assistant

> Production-ready, grounded Retrieval-Augmented Generation (RAG) platform with multi-tenant data isolation, role-based access control (RBAC), pgvector semantic search, and verifiable source citations.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-336791?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![React](https://img.shields.io/badge/React-18%2F19%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%203.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Repository Description (Under 350 Characters)
> Enterprise AI Knowledge Assistant is a production-grade full-stack RAG platform with FastAPI, React, PostgreSQL/pgvector, and Google Gemini. Features strict citation-grounded answers, tenant isolation, RBAC, background vector indexing, and audit logging.

---

## 1. Project Overview & Problem Statement

Modern enterprises face significant knowledge fragmentation: critical operating procedures, compliance guidelines, HR policies, and technical runbooks are scattered across disconnected PDFs, Word documents, and spreadsheets. Standard LLM chatbots fail in corporate environments due to:

1. **Hallucinations & Speculation**: Generative models invent plausible policies that do not exist.
2. **Lack of Verifiable Grounding**: Employees cannot identify the underlying page, document, or author.
3. **Data Leaks & Unauthorized Access**: Sensitive internal documents must not leak across organizational tenants or unauthorized job roles.

**Enterprise AI Knowledge Assistant** solves these challenges by combining:
* **Mathematical Evidence Grounding**: An LLM is strictly constrained to answer only from retrieved passages. If evidence is lacking, it explicitly states: *"I could not find the answer in the available sources."*
* **Verifiable Source Citations**: Every generated response includes clickable source pills with document names, page numbers, similarity match scores, and exact extracted passages.
* **Three-Tier Role-Based Access Control (RBAC)**: Backend-enforced role privileges for **ADMIN**, **KNOWLEDGE_MANAGER**, and **EMPLOYEE**.
* **Multi-Tenant Isolation**: Complete row-level and query-level isolation ensuring zero cross-organization data leakage.

---

## 2. System Architecture

```mermaid
graph TD
    Client["Client Browser (React 18 + Vite + Tailwind)"] -->|JWT Bearer / Secure Cookies| API["FastAPI API Server (Python 3.12)"]
    
    subgraph Security & Access Control
        API --> Auth["Auth & Session Controller (/api/v1/auth)"]
        API --> RBAC["RBAC Middleware (Admin / KM / Employee)"]
        API --> Audit["Audit Logger (/api/v1/audit)"]
    end

    subgraph Document Ingestion Pipeline
        API --> DocCtrl["Document Controller (/api/v1/documents)"]
        DocCtrl --> Storage["Local / Object Storage (SHA-256 Checksum)"]
        DocCtrl --> Queue["Worker Queue (Async / Redis)"]
        Queue --> Extractor["Text Extraction (PyMuPDF / docx / csv / txt)"]
        Extractor --> Chunker["Sliding Window Chunker (800 chars / 150 overlap)"]
        Chunker --> Embedder["Embedding Provider (Gemini / Mock 768-dim)"]
        Embedder --> VectorDB[("PostgreSQL + pgvector")]
    end

    subgraph Grounded RAG Query Pipeline
        API --> ChatCtrl["Chat Controller (/api/v1/chat)"]
        ChatCtrl --> QueryEmbed["Query Vectorizer"]
        QueryEmbed --> SimilaritySearch["pgvector Cosine Search + Org Filter"]
        SimilaritySearch --> ContextAssembly["Grounded Context Formatter"]
        ContextAssembly --> LLM["LLM Provider (Google Gemini / Mock)"]
        LLM --> CitationEngine["Citation & Evidence Matcher"]
        CitationEngine --> ChatHistory[("Chat Sessions & Feedbacks")]
    end
```

---

## 3. Database Schema (Entity-Relationship Diagram)

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER : "has members"
    ORGANIZATION ||--o{ DOCUMENT : "owns"
    ORGANIZATION ||--o{ CHAT_SESSION : "contains"
    ORGANIZATION ||--o{ AUDIT_LOG : "records"
    
    USER ||--o{ DOCUMENT : "uploads"
    USER ||--o{ CHAT_SESSION : "conducts"
    USER ||--o{ FEEDBACK : "submits"
    
    DOCUMENT ||--o{ DOCUMENT_CHUNK : "split into"
    DOCUMENT ||--o{ DOCUMENT_PERMISSION : "governed by"
    
    CHAT_SESSION ||--o{ CHAT_MESSAGE : "contains"
    CHAT_MESSAGE ||--o| FEEDBACK : "evaluated by"

    ORGANIZATION {
        string id PK
        string name UK
        datetime created_at
    }

    USER {
        string id PK
        string organization_id FK
        string name
        string email UK
        string password_hash
        string role "ADMIN | KNOWLEDGE_MANAGER | EMPLOYEE"
        boolean is_active
        datetime created_at
    }

    DOCUMENT {
        string id PK
        string organization_id FK
        string uploaded_by FK
        string filename
        string storage_key
        string content_type
        int file_size
        string checksum "SHA-256"
        string status "PENDING | PROCESSING | COMPLETED | FAILED"
        string category
        json tags
        int chunk_count
        string error_message
    }

    DOCUMENT_CHUNK {
        string id PK
        string document_id FK
        string organization_id FK
        int chunk_index
        text content
        vector embedding "Vector(768)"
        int page_number
        json chunk_metadata
    }

    CHAT_SESSION {
        string id PK
        string user_id FK
        string organization_id FK
        string title
        datetime updated_at
    }

    CHAT_MESSAGE {
        string id PK
        string session_id FK
        string role "user | assistant"
        text content
        json retrieved_sources
        datetime created_at
    }

    FEEDBACK {
        string id PK
        string message_id FK
        string user_id FK
        int rating "1 or -1"
        string comment
    }

    AUDIT_LOG {
        string id PK
        string organization_id FK
        string actor_user_id FK
        string action
        string resource_type
        string resource_id
        json audit_metadata
        string ip_address
    }
```

---

## 4. End-to-End RAG Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Employee
    participant Frontend as React Client
    participant Backend as FastAPI Server
    participant VectorStore as PostgreSQL (pgvector)
    participant AI as Gemini LLM Provider

    Employee->>Frontend: Enters query ("What is our annual leave policy?")
    Frontend->>Backend: POST /api/v1/chat/sessions/{id}/messages
    Backend->>Backend: Verify JWT token & Organization isolation
    Backend->>Backend: Generate 768-dim Query Vector
    Backend->>VectorStore: Cosine distance query filtered by Org ID & Permissions
    VectorStore-->>Backend: Top-K (5) highest similarity chunks + page numbers
    
    alt Sufficient Evidence Exists
        Backend->>AI: Send System Instruction + Retrieved Passages + Query
        AI-->>Backend: Grounded answer strictly citing provided facts
        Backend->>Backend: Attach genuine Citation objects (Doc, Page, Excerpt)
    else Context Missing / Out of Domain
        Backend-->>Frontend: "I could not find the answer in the available sources."
    end
    
    Backend->>Frontend: Return answer + genuine citations
    Frontend->>Employee: Display Markdown message + interactive citation pills
    Employee->>Frontend: Click citation pill -> View exact extracted passage
    Employee->>Frontend: Thumbs up / down feedback recorded
```

---

## 5. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18/19, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Lucide Icons, React Markdown |
| **Backend** | Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.0 (Asyncio), Greenlet, Passlib (Argon2), Python-Jose |
| **Database** | PostgreSQL 16 with `pgvector` extension (with SQLite + in-memory vector fallback for zero-dependency tests) |
| **Document Parsing** | PyMuPDF (`fitz`) for PDF page extraction, `python-docx` for Word, CSV/TXT structured segmenters |
| **AI Providers** | Google Gemini (`text-embedding-004`, `gemini-1.5-flash`), OpenAI fallback, Deterministic Mock provider |
| **Background Processing** | Asynchronous worker architecture with SHA-256 duplicate detection and idempotent chunk cleanup |
| **Testing** | Pytest, Pytest-Asyncio, HTTPX ASGI Transport (22 unit, integration, and security tests) |
| **DevOps & Containers** | Docker, Docker Compose, Nginx Alpine, Multi-stage builds |

---

## 6. Project Structure

```text
Enterprise AI Knowledge Assistant/
├── backend/
│   ├── app/
│   │   ├── api/v1/           # Modular REST controllers
│   │   │   ├── auth.py       # JWT register, login, refresh rotation, logout
│   │   │   ├── users.py      # User management & RBAC role promotion
│   │   │   ├── documents.py  # File upload, chunk inspection, permissions
│   │   │   ├── chat.py       # Conversational RAG Q&A & feedback
│   │   │   ├── dashboard.py  # Realtime operational metrics
│   │   │   ├── audit.py      # Security compliance logs
│   │   │   └── router.py     # Aggregated v1 router
│   │   ├── core/             # Configuration, security, logging
│   │   ├── db/               # SQLAlchemy models & cross-dialect VectorType
│   │   ├── models/           # Normalized database entities
│   │   ├── schemas/          # Pydantic v2 request/response schemas
│   │   ├── rag/              # Document extractors, chunker, AI providers, RAG pipeline
│   │   ├── storage/          # Local & private object storage abstraction
│   │   ├── workers/          # Idempotent document ingestion & vectorization queue
│   │   └── main.py           # FastAPI entrypoint, CORS & health probes
│   ├── alembic/              # Alembic database migrations
│   ├── tests/                # Automated pytest suite
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable Badge, Button, Card, Modal, CitationDrawer
│   │   ├── context/          # AuthContext and ToastContext
│   │   ├── pages/            # 12 production pages
│   │   ├── services/         # Axios API clients with auto token refresh
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Router & protected route guards
│   │   └── index.css         # Tailwind directives
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── demo_documents/           # Sample policies for HR, Engineering, and Security
├── docker-compose.yml        # Orchestration for PostgreSQL + pgvector, Redis, Backend, Frontend
├── .env.example              # Complete configuration template
├── .gitignore
└── LICENSE                   # MIT
```

---

## 7. Getting Started

### Option A: Running with Docker Compose (Recommended for Full Stack)

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/enterprise-ai-knowledge-assistant.git
   cd "enterprise-ai-knowledge-assistant"
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   *(Optional: Add your `GEMINI_API_KEY` from Google AI Studio. If left empty, the application seamlessly uses the built-in deterministic offline mock provider).*

3. Launch all containers:
   ```bash
   docker-compose up --build
   ```

4. Seed the database with demo users and realistic documents:
   ```bash
   docker-compose exec backend python -m app.db.seed
   ```

5. Open your browser:
   * **Frontend Application**: `http://localhost:5173` (or `http://localhost:80`)
   * **Backend OpenAPI Docs**: `http://localhost:8000/docs`
   * **Health Probe**: `http://localhost:8000/health`

---

### Option B: Local Bare-Metal Development (Fastest for Testing)

#### 1. Backend Setup:
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
cp ../.env.example .env

# Run database seed (creates demo users & indexes demo documents)
python -m app.db.seed

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.

---

## 8. Demo Credentials & Test Scenarios

The seed script creates a complete enterprise organization (**Acme Enterprise**) with three pre-configured accounts:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@acme.com` | `DemoPass123!` | Full control, role assignment, audit logs, document curation |
| **Knowledge Manager** | `manager@acme.com` | `DemoPass123!` | Upload documents, inspect chunks, configure document permissions |
| **Employee** | `employee@acme.com` | `DemoPass123!` | Ask questions, review citations, submit answer feedback |

*(Tip: The login page includes convenient **One-Click Demo Login** buttons for instant role switching).*

### Sample Questions to Try:
1. *"What is our annual leave policy and how many days are allowed?"*
   * **Expected Grounding**: Cites `hr_annual_leave_policy.txt`, mentions 25 working days, 5 carry-over days into Q1.
2. *"Explain the production deployment procedure and rollback criteria."*
   * **Expected Grounding**: Cites `production_deployment_runbook.txt`, mentions 10% Canary rollout, rollback triggered if error rate > 0.5% or P99 latency > 800ms.
3. *"What are the steps for reporting a security incident under GDPR?"*
   * **Expected Grounding**: Cites `security_incident_response_protocol.txt`, mentions 15-minute response SLA for SEV-1, GDPR 72-hour notification timeline.
4. *"What is the orbital velocity of Jupiter?"*
   * **Expected Fallback**: *"I could not find the answer in the available sources."* (Zero hallucinations).

---

## 9. Automated Testing Suite

The backend includes a comprehensive automated test suite spanning unit tests, integration tests, and security tests:

```bash
cd backend
python -m pytest -v
```

### Test Coverage Highlights:
* `test_auth_api.py`: User registration, Argon2 password hashing, login, JWT issuance, refresh token rotation, and revocation.
* `test_documents_api.py`: File validation, SHA-256 duplicate rejection, chunk extraction, and metadata retrieval.
* `test_chat_rag_api.py`: End-to-end RAG question answering, citation verification, feedback rating submission, and insufficient evidence fallback.
* `test_security.py`: Cross-organization tenant isolation, privilege escalation blocking, and session hijacking prevention.
* `test_unit.py`: Sliding window chunker, text extractors (PDF, DOCX, TXT, CSV), cosine similarity math, and filename sanitization.

---

## 10. Security & Hardening Features

* **Grounded Prompts**: Retrieved documents are treated as untrusted data; system prompts strictly isolate context from execution commands.
* **Token Rotation & Revocation**: Refresh tokens rotate on every use; revoked tokens are blacklisted immediately.
* **Path Traversal Protection**: Uploaded filenames are sanitized and stored behind UUID-based storage keys. Entire files are never exposed as public static URLs.
* **Checksum Deduplication**: SHA-256 fingerprinting prevents duplicate document uploads within the same organization.
* **Audit Logging**: All sensitive actions (authentication, uploads, deletions, role updates, and feedback) are stored in an append-only audit trail.

---

## 11. Screenshots Section

| Screen | Description |
| :--- | :--- |
| **AI Assistant / Chat** | Conversational UI with markdown rendering, interactive citations, and feedback buttons. |
| **Operational Dashboard** | Realtime metrics on indexed documents, question volume, and helpful feedback ratios. |
| **Document Library** | Filterable table showing upload statuses, chunk counts, categories, and tags. |
| **Citation Inspector** | Modal displaying the exact text chunk, page number, and similarity match percentage. |
| **Security Audit Trail** | Immutable log tracking user activities, IP addresses, and resource mutations. |

---

## 12. Limitations & Future Roadmap

* **Document Scale**: Currently configured for local and single-instance pgvector storage. Future releases can incorporate hybrid BM25 + dense vector reranking (e.g., Cohere or FlashRank).
* **OCR Support**: Current PDF extraction parses text streams via PyMuPDF. Integration with Tesseract or Google Cloud Vision can enable scanned image PDF extraction.
* **Streaming Responses**: Server-Sent Events (SSE) endpoint structure prepared for streaming tokens.

---

## 13. License

Distributed under the **MIT License**. See `LICENSE` for details.
