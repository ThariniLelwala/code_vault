from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas
from .database import get_db

router = APIRouter()

@router.get("/snippets", response_model=List[schemas.SnippetResponse])
def get_snippets(query: str = None, tag: str = None, db: Session = Depends(get_db)):
    snippets_query = db.query(models.Snippet)
    
    if query:
        snippets_query = snippets_query.filter(
            (models.Snippet.title.ilike(f"%{query}%")) | 
            (models.Snippet.content.ilike(f"%{query}%"))
        )
    
    if tag:
        snippets_query = snippets_query.filter(models.Snippet.tags.ilike(f"%{tag}%"))
        
    return snippets_query.order_by(models.Snippet.created_at.desc()).all()

@router.post("/snippets", response_model=schemas.SnippetResponse)
def create_snippet(snippet: schemas.SnippetCreate, db: Session = Depends(get_db)):
    db_snippet = models.Snippet(**snippet.model_dump())
    db.add(db_snippet)
    db.commit()
    db.refresh(db_snippet)
    return db_snippet

@router.put("/snippets/{snippet_id}", response_model=schemas.SnippetResponse)
def update_snippet(snippet_id: int, snippet: schemas.SnippetUpdate, db: Session = Depends(get_db)):
    db_snippet = db.query(models.Snippet).filter(models.Snippet.id == snippet_id).first()
    if not db_snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")
        
    update_data = snippet.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_snippet, key, value)
        
    db.commit()
    db.refresh(db_snippet)
    return db_snippet

@router.delete("/snippets/{snippet_id}")
def delete_snippet(snippet_id: int, db: Session = Depends(get_db)):
    db_snippet = db.query(models.Snippet).filter(models.Snippet.id == snippet_id).first()
    if not db_snippet:
        raise HTTPException(status_code=404, detail="Snippet not found")
        
    db.delete(db_snippet)
    db.commit()
    return {"message": "Snippet deleted successfully"}
