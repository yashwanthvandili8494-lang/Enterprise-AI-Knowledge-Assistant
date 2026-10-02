import json
from typing import List, Optional
from sqlalchemy import TypeDecorator, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, FLOAT
try:
    from pgvector.sqlalchemy import Vector as PGVector
    HAS_PGVECTOR = True
except ImportError:
    HAS_PGVECTOR = False


class VectorType(TypeDecorator):
    """
    Cross-dialect Vector column type.
    Uses pgvector Vector in PostgreSQL and JSON/String representation in SQLite.
    """
    impl = Text
    cache_ok = True

    def __init__(self, dim: int = 768):
        self.dim = dim
        super().__init__()

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return dialect.type_descriptor(PGVector(self.dim))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Optional[List[float]], dialect):
        if value is None:
            return None
        if dialect.name == "postgresql" and HAS_PGVECTOR:
            return value
        return json.dumps([float(x) for x in value])

    def process_result_value(self, value, dialect) -> Optional[List[float]]:
        if value is None:
            return None
        if isinstance(value, list):
            return [float(x) for x in value]
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return [float(x) for x in parsed]
            except Exception:
                # pgvector might return string format "[0.1, 0.2]"
                clean = value.strip("[]").split(",")
                return [float(x.strip()) for x in clean if x.strip()]
        return list(value)
