import logging
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, delete
from app.db.session import AsyncSessionLocal
from app.models.document import Document, DocumentStatus
from app.models.chunk import DocumentChunk
from app.storage.local import default_storage
from app.rag.extractors import extract_document_text
from app.rag.chunker import SemanticChunker
from app.rag.providers import get_embedding_provider

logger = logging.getLogger("enterprise_ai.worker")


async def process_document_task(document_id: str, max_retries: int = 3):
    """
    Idempotent background worker task to extract, chunk, embed, and index a document.
    Cleans up any partial or previous chunks before processing.
    """
    logger.info(f"Starting background processing for document: {document_id}")
    
    async with AsyncSessionLocal() as db:
        # Step 1: Fetch document
        doc = await db.get(Document, document_id)
        if not doc:
            logger.error(f"Document {document_id} not found for processing")
            return

        doc.status = DocumentStatus.PROCESSING.value
        doc.error_message = None
        await db.commit()

        try:
            # Step 2: Idempotent cleanup - delete any existing chunks for this document
            await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
            await db.commit()

            # Step 3: Read file from storage
            file_bytes = await default_storage.read_file(doc.storage_key)

            # Step 4: Extract text pages
            extracted_pages = extract_document_text(doc.filename, file_bytes)
            if not extracted_pages:
                raise ValueError("No readable text could be extracted from document.")

            # Step 5: Chunk text
            chunker = SemanticChunker()
            chunk_items = chunker.chunk_pages(extracted_pages)
            if not chunk_items:
                raise ValueError("Document yielded 0 chunks after text segmentation.")

            # Step 6: Generate embeddings in batches
            embedding_provider = get_embedding_provider()
            chunk_texts = [item.content for item in chunk_items]
            embeddings = await embedding_provider.embed_documents(chunk_texts)

            # Step 7: Persist chunks with embeddings
            new_chunks = []
            for item, emb in zip(chunk_items, embeddings):
                chunk_obj = DocumentChunk(
                    document_id=doc.id,
                    organization_id=doc.organization_id,
                    chunk_index=item.chunk_index,
                    content=item.content,
                    embedding=emb,
                    page_number=item.page_number,
                    chunk_metadata=item.metadata
                )
                new_chunks.append(chunk_obj)

            db.add_all(new_chunks)
            
            # Step 8: Update document status
            doc.status = DocumentStatus.COMPLETED.value
            doc.chunk_count = len(new_chunks)
            doc.error_message = None
            doc.updated_at = datetime.now(timezone.utc)
            await db.commit()
            
            logger.info(f"Successfully processed document {doc.filename} ({len(new_chunks)} chunks indexed)")

        except Exception as e:
            logger.exception(f"Error processing document {document_id}: {str(e)}")
            await db.rollback()
            
            # Record failure status
            failed_doc = await db.get(Document, document_id)
            if failed_doc:
                failed_doc.status = DocumentStatus.FAILED.value
                failed_doc.error_message = str(e)[:500]
                failed_doc.updated_at = datetime.now(timezone.utc)
                await db.commit()
