import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import DATABASE_URL

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

def init_engine(url: str):
    """Initializes SQLAlchemy engine with fallback to local SQLite if PostgreSQL connection fails."""
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    
    engine = create_engine(url, connect_args=connect_args)
    
    # Test connection if PostgreSQL
    if url.startswith("postgresql"):
        try:
            with engine.connect() as conn:
                pass
            logger.info("Successfully connected to PostgreSQL database.")
        except Exception as err:
            logger.warning(
                f"Failed to connect to PostgreSQL ({err}). Falling back to local SQLite database."
            )
            fallback_url = "sqlite:///./code_vault.db"
            engine = create_engine(fallback_url, connect_args={"check_same_thread": False})
            
    return engine

engine = init_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

