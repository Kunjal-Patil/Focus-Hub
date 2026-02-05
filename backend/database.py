from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. DATABASE URL
# Replace 'password' with your actual Postgres password.
# Format: postgresql+asyncpg://user:password@localhost/dbname
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost/focushub"

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
# This helper gives the API a database session when needed
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session