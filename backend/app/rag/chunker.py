import re
from typing import List, Dict, Any
from app.rag.extractors import ExtractedPage
from app.core.config import settings


class ChunkItem:
    def __init__(self, chunk_index: int, content: str, page_number: int = None, metadata: Dict[str, Any] = None):
        self.chunk_index = chunk_index
        self.content = content.strip()
        self.page_number = page_number
        self.metadata = metadata or {}

    def to_dict(self):
        return {
            "chunk_index": self.chunk_index,
            "content": self.content,
            "page_number": self.page_number,
            "metadata": self.metadata
        }


class SemanticChunker:
    def __init__(self, chunk_size: int = settings.CHUNK_SIZE, chunk_overlap: int = settings.CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk_pages(self, pages: List[ExtractedPage]) -> List[ChunkItem]:
        """
        Splits extracted pages into overlapping semantic chunks, preserving page references.
        """
        chunks: List[ChunkItem] = []
        global_chunk_idx = 0

        for page in pages:
            text = page.content.strip()
            if not text:
                continue

            # Split text by paragraphs first
            paragraphs = [p.strip() for p in re.split(r'\n\s*\n', text) if p.strip()]
            
            current_chunk_parts: List[str] = []
            current_length = 0

            for para in paragraphs:
                para_len = len(para)
                
                # If a single paragraph is larger than chunk_size, split by sentences
                if para_len > self.chunk_size:
                    sentences = re.split(r'(?<=[.!?])\s+', para)
                    for sent in sentences:
                        sent_len = len(sent)
                        if current_length + sent_len > self.chunk_size and current_chunk_parts:
                            chunk_text = " ".join(current_chunk_parts)
                            chunks.append(ChunkItem(
                                chunk_index=global_chunk_idx,
                                content=chunk_text,
                                page_number=page.page_number,
                                metadata={"char_count": len(chunk_text), "page": page.page_number}
                            ))
                            global_chunk_idx += 1
                            
                            # Keep overlap from previous parts
                            overlap_parts = []
                            overlap_len = 0
                            for part in reversed(current_chunk_parts):
                                if overlap_len + len(part) <= self.chunk_overlap:
                                    overlap_parts.insert(0, part)
                                    overlap_len += len(part)
                                else:
                                    break
                            current_chunk_parts = overlap_parts
                            current_length = overlap_len
                        
                        current_chunk_parts.append(sent)
                        current_length += sent_len
                else:
                    if current_length + para_len > self.chunk_size and current_chunk_parts:
                        chunk_text = "\n\n".join(current_chunk_parts)
                        chunks.append(ChunkItem(
                            chunk_index=global_chunk_idx,
                            content=chunk_text,
                            page_number=page.page_number,
                            metadata={"char_count": len(chunk_text), "page": page.page_number}
                        ))
                        global_chunk_idx += 1
                        
                        # Retain overlap
                        overlap_parts = []
                        overlap_len = 0
                        for part in reversed(current_chunk_parts):
                            if overlap_len + len(part) <= self.chunk_overlap:
                                overlap_parts.insert(0, part)
                                overlap_len += len(part)
                            else:
                                break
                        current_chunk_parts = overlap_parts
                        current_length = overlap_len
                    
                    current_chunk_parts.append(para)
                    current_length += para_len

            # Flush final chunk of page
            if current_chunk_parts:
                chunk_text = "\n\n".join(current_chunk_parts)
                chunks.append(ChunkItem(
                    chunk_index=global_chunk_idx,
                    content=chunk_text,
                    page_number=page.page_number,
                    metadata={"char_count": len(chunk_text), "page": page.page_number}
                ))
                global_chunk_idx += 1

        return chunks
