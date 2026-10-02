import pytest
from app.rag.extractors import extract_document_text, ExtractedPage
from app.rag.chunker import SemanticChunker
from app.rag.providers import MockEmbeddingProvider, MockLLMProvider
from app.rag.pipeline import cosine_similarity
from app.storage.local import sanitize_filename, calculate_checksum
from app.core.security import get_password_hash, verify_password


def test_sanitize_filename():
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\windows\\system32.dll") in ["system32.dll", "windows_system32.dll"]
    assert sanitize_filename("report (2024) [final].pdf") == "report__2024___final_.pdf"


def test_calculate_checksum():
    data = b"Enterprise AI Knowledge Assistant"
    cs1 = calculate_checksum(data)
    cs2 = calculate_checksum(data)
    assert cs1 == cs2
    assert len(cs1) == 64  # SHA-256 hex string


def test_password_hashing():
    pwd = "SecureCompanyPassword123!"
    h = get_password_hash(pwd)
    assert h != pwd
    assert verify_password(pwd, h) is True
    assert verify_password("WrongPassword", h) is False


def test_extract_text_txt():
    sample = b"Section 1: Introduction\n\nThis is paragraph 1.\n\nThis is paragraph 2."
    pages = extract_document_text("policy.txt", sample)
    assert len(pages) >= 1
    assert "Section 1: Introduction" in pages[0].content


def test_extract_text_csv():
    sample = b"PolicyID,Title,Department\nPOL-1,Vacation,HR\nPOL-2,Deployment,DevOps"
    pages = extract_document_text("data.csv", sample)
    assert len(pages) == 1
    assert "PolicyID: POL-1" in pages[0].content
    assert "Title: Vacation" in pages[0].content


def test_extract_unsupported_format():
    with pytest.raises(ValueError):
        extract_document_text("malicious.exe", b"binary content")


def test_semantic_chunker():
    chunker = SemanticChunker(chunk_size=100, chunk_overlap=20)
    pages = [
        ExtractedPage(page_number=1, content="Paragraph one is here. Paragraph two follows with some additional text to make it long enough.")
    ]
    chunks = chunker.chunk_pages(pages)
    assert len(chunks) >= 1
    assert all(c.page_number == 1 for c in chunks)
    assert all(len(c.content) > 0 for c in chunks)


@pytest.mark.asyncio
async def test_mock_embedding_provider():
    provider = MockEmbeddingProvider(dim=768)
    vec1 = await provider.embed_text("Annual leave policy vacation days")
    vec2 = await provider.embed_text("Annual leave policy vacation days")
    vec3 = await provider.embed_text("Production server database kubernetes cluster")

    assert len(vec1) == 768
    # Same text should yield exact identical vector
    sim_identical = cosine_similarity(vec1, vec2)
    assert pytest.approx(sim_identical, 0.001) == 1.0

    # Overlapping words should have higher similarity than unrelated text
    vec4 = await provider.embed_text("vacation days and annual leave")
    sim_similar = cosine_similarity(vec1, vec4)
    sim_different = cosine_similarity(vec1, vec3)
    assert sim_similar > sim_different


@pytest.mark.asyncio
async def test_mock_llm_grounded_answer():
    llm = MockLLMProvider()
    prompt = "Question: What is the annual leave allowance?\n\nContext:\n[Document: HR Policy | Page 1]\nEmployees receive 25 days of annual leave per year.\n\nAnswer:"
    answer = await llm.generate_answer(prompt)
    assert "25 days" in answer or "annual leave" in answer.lower()

    # When no evidence is present
    no_evidence_prompt = "Question: What is the space shuttle orbital velocity?\n\nContext:\n[Document: HR Policy | Page 1]\nEmployees receive 25 days of annual leave per year.\n\nAnswer:"
    fallback_answer = await llm.generate_answer(no_evidence_prompt)
    assert "could not find the answer" in fallback_answer.lower()
