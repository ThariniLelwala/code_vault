from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime, timezone
from .database import Base

class Snippet(Base):
    __tablename__ = "snippets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    language = Column(String, index=True)
    content = Column(Text, nullable=False)
    tags = Column(String) # Comma-separated string of tags
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

