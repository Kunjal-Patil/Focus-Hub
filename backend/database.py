import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load local .env file
load_dotenv()

# 1. Get the raw URL from the environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost/focushub")

# --- CRITICAL FIX FOR RENDER + NEON ---
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# Remove the '?sslmode=require' query parameters if they exist
# asyncpg prefers the connect_args dictionary for SSL settings
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

print(f"🔌 Connecting to Database URL: {DATABASE_URL}")

# 2. CREATE ENGINE (With explicit SSL handling)
# We pass ssl="require" in connect_args, which is how asyncpg wants it.
engine = create_async_engine(
    DATABASE_URL, 
    echo=True,
    connect_args={"ssl": "require"} if "neon.tech" in DATABASE_URL else {}
)

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