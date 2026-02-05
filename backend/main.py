from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json
import time
import os
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

from database import engine, Base, get_db
from models import User

# --- SECURITY CONFIG ---
load_dotenv() # Load environment variables from .env file

# Fallback to hardcoded key if .env fails (for local dev only)
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

# --- CORS CONFIGURATION (THE FIX) ---
# We explicitly list all the domains that are allowed to talk to your backend.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://focushub-nu.vercel.app",                    # Your main Vercel URL
    "https://focus-w1nkml4fy-kunjals-projects-d6c9ec8c.vercel.app", # Your Preview URL (from screenshot)
    os.getenv("FRONTEND_URL")                              # Allows adding more via Render Dashboard
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# --- AUTH HELPERS ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    result = await db.execute(select(User).filter(User.username == username))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# --- ENDPOINTS ---
@app.post("/register")
async def register(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.username == form_data.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_pw = get_password_hash(form_data.password)
    new_user = User(username=form_data.username, hashed_password=hashed_pw)
    db.add(new_user)
    await db.commit()
    return {"msg": "User created successfully"}

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.username == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    # SECURITY UPGRADE: Include 'id' in the token so WebSocket doesn't need to ask DB
    access_token = create_access_token(data={"sub": user.username, "id": user.id})
    
    return {"access_token": access_token, "token_type": "bearer", "username": user.username, "user_id": user.id}

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "flowers": current_user.flowers_grown, "id": current_user.id}

@app.post("/user/{user_id}/claim-reward")
async def claim_reward(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalars().first()
    if user:
        user.flowers_grown += 1
        await db.commit()
    return {"status": "success"}

@app.get("/user/{user_id}")
async def get_user_stats(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalars().first()
    if not user: return {"flowers": 0}
    return {"flowers": user.flowers_grown}

@app.get("/leaderboard")
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.flowers_grown.desc()).limit(10))
    users = result.scalars().all()
    return [{"username": u.username, "flowers": u.flowers_grown} for u in users]


# --- WEBSOCKETS (SECURE TOKEN AUTH) ---
room_states = {} 

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[Dict]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, username: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        
        # Remove old connection
        self.active_connections[room_id] = [c for c in self.active_connections[room_id] if c['username'] != username]

        initial_status = "idle"
        if room_id in room_states and room_states[room_id]["is_active"]:
             initial_status = "focusing"

        self.active_connections[room_id].append({
            "ws": websocket, 
            "username": username,
            "status": initial_status 
        })
        await self.broadcast_user_list(room_id)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [c for c in self.active_connections[room_id] if c["ws"] != websocket]
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def update_status(self, room_id: str, username: str, new_status: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection["username"] == username:
                    connection["status"] = new_status
            await self.broadcast_user_list(room_id)

    async def broadcast(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                try: await connection["ws"].send_text(json.dumps(message))
                except: pass

    async def broadcast_user_list(self, room_id: str):
        if room_id in self.active_connections:
            users_data = [{"username": c["username"], "status": c["status"]} for c in self.active_connections[room_id]]
            message = {"type": "USER_LIST", "users": users_data}
            for connection in self.active_connections[room_id]:
                try: await connection["ws"].send_text(json.dumps(message))
                except: pass

manager = ConnectionManager()

# SECURITY UPGRADE: Removed {user_id}/{username} from URL. Added 'token' query param.
@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, token: str = Query(...)):
    # 1. VERIFY TOKEN BEFORE ACCEPTING CONNECTION
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user_id = payload.get("id")
        
        if username is None or user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
            
    except JWTError:
        # Invalid Token -> Reject Connection
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 2. Token is valid! Proceed to connect.
    await manager.connect(websocket, room_id, username)
    
    if room_id in room_states and room_states[room_id]["is_active"]:
        remaining = room_states[room_id]["end_time"] - time.time()
        if remaining > 0:
            await websocket.send_text(json.dumps({"type": "SYNC_TIMER", "end_time": room_states[room_id]["end_time"]}))

    try:
        while True:
            data = await websocket.receive_text()
            data_json = json.loads(data)
            action = data_json.get("action")
            
            if action == "START_TIMER":
                duration = int(data_json.get("duration", 25))
                end_time = time.time() + (duration * 60)
                room_states[room_id] = {"end_time": end_time, "is_active": True}
                for conn in manager.active_connections.get(room_id, []):
                    conn["status"] = "focusing"
                await manager.broadcast_user_list(room_id)
                await manager.broadcast({"type": "TIMER_STARTED", "end_time": end_time}, room_id)
            
            elif action == "FAIL":
                await manager.update_status(room_id, username, "failed")
                
            elif action == "REJOIN":
                await manager.update_status(room_id, username, "focusing")
            
            elif action == "CHAT":
                message_text = data_json.get("message")
                if message_text:
                    chat_msg = {
                        "type": "CHAT",
                        "username": username,
                        "text": message_text,
                        "timestamp": time.strftime("%H:%M")
                    }
                    await manager.broadcast(chat_msg, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast_user_list(room_id)