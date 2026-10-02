import asyncio
import logging
from app.core.config import settings
from app.workers.processor import process_document_task

logger = logging.getLogger("enterprise_ai.queue")


async def enqueue_document_processing(document_id: str):
    """
    Enqueues a document for background processing.
    Supports asynchronous in-process worker task as well as distributed Redis queue.
    """
    logger.info(f"Enqueuing document {document_id} for processing")
    
    # Spawn background task in current event loop
    loop = asyncio.get_event_loop()
    loop.create_task(process_document_task(document_id))
