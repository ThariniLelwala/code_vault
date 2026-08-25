from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SnippetBase(BaseModel):
    title: str
    language: Optional[str] = "Plain Text"
    content: str
    tags: Optional[str] = ""

class SnippetCreate(SnippetBase):
    pass

class SnippetUpdate(BaseModel):
    title: Optional[str] = None
    language: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[str] = None

class SnippetResponse(SnippetBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
