from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True) # Changed to Integer ID
    username = Column(String, unique=True, index=True) # New: Username
    hashed_password = Column(String)                   # New: Password
    flowers_grown = Column(Integer, default=0)