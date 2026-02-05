import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load local .env file (doesn't hurt in production, essential for local dev)
load_dotenv()

# --- THE FIX IS HERE ---
# 1. Try to get the URL from the Environment (Render/Neon)
# 2. If it's missing, fall back to localhost (Your computer)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/focushub")

# FIX for Render/Neon compatibility:
# Render gives "postgres://", but SQLAlchemy needs "postgresql://". We must fix the string.
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    
# Ensure we are using the async driver
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
     DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

print(f"🔌 Connecting to Database URL: {DATABASE_URL}") # Debug print to see what's happening

# 2. CREATE ENGINE
engine = create_async_engine(DATABASE_URL, echo=True)

# 3. CREATE SESSION FACTORY
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 4. BASE CLASS FOR MODELS
Base = declarative_base()

# 5. DEPENDENCY INJECTION
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session