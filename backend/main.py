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

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 3000

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://focushub-nu.vercel.app",
    "https://focus-bitmcavx9-kunjals-projects-d6c9ec8c.vercel.app",
    os.getenv("FRONTEND_URL")
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

# AUTH HELPERS
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

# ENDPOINTS
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
    
    access_token = create_access_token(data={"sub": user.username, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username, "user_id": user.id}

@app.get("/users/me")
async def read_users_me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "flowers": current_user.flowers_grown, "id": current_user.id}

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


# WEBSOCKETS & STATE
room_states = {} 
# Persistent storage: { room_id: { user_id: first_join_timestamp } }
room_attendance = {} 

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[Dict]] = {}

    async def connect(self, websocket: WebSocket, room_id: str, username: str, user_id: int):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        
        # Remove old connection instance for this user
        self.active_connections[room_id] = [c for c in self.active_connections[room_id] if c['username'] != username]
        
        current_time = time.time()
        initial_status = "idle"

        # ATTENDANCE LOGIC:
        # If session is active, check if user was already here.
        # If yes, keep old time (prevents refresh bug).
        # If no, set new time (late joiner).
        if room_id in room_states and room_states[room_id]["is_active"]:
            initial_status = "focusing"
            if room_id not in room_attendance: room_attendance[room_id] = {}
            if user_id not in room_attendance[room_id]:
                room_attendance[room_id][user_id] = current_time
        else:
            # If idle, set time, but it will be reset on START_TIMER
            if room_id not in room_attendance: room_attendance[room_id] = {}
            room_attendance[room_id][user_id] = current_time

        self.active_connections[room_id].append({
            "ws": websocket, 
            "username": username,
            "user_id": user_id, 
            "status": initial_status,
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

# REWARD CLAIM WITH PERSISTENT ATTENDANCE CHECK
@app.post("/user/{user_id}/claim-reward")
async def claim_reward(
    user_id: str, 
    room_id: str = Query(...), 
    db: AsyncSession = Depends(get_db)
):
    state = room_states.get(room_id)
    if not state:
        raise HTTPException(status_code=400, detail="No active session found.")

    user_id_int = int(user_id)
    # Check if user has an attendance record
    if room_id not in room_attendance or user_id_int not in room_attendance[room_id]:
         raise HTTPException(status_code=403, detail="User not found in session records.")

    # Calculate time based on ORIGINAL join time
    join_time = room_attendance[room_id][user_id_int]
    present_seconds = time.time() - join_time
    required_seconds = (state["duration"] * 0.9) * 60 

    # Debug print
    print(f"User {user_id}: Present {present_seconds:.2f}s, Required {required_seconds:.2f}s")

    if present_seconds < required_seconds:
        minutes_present = round(present_seconds / 60, 2)
        minutes_required = round(required_seconds / 60, 2)
        
        error_detail = json.dumps({
            "error_code": "LOW_ATTENDANCE",
            "present": minutes_present,
            "required": minutes_required,
            "percentage": int((present_seconds / (state["duration"] * 60)) * 100)
        })
        raise HTTPException(status_code=403, detail=error_detail)

    result = await db.execute(select(User).filter(User.id == user_id_int))
    user = result.scalars().first()
    if user:
        user.flowers_grown += 1
        await db.commit()
    return {"status": "success"}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, token: str = Query(...)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user_id = payload.get("id")
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await manager.connect(websocket, room_id, username, user_id)
    
    # Sync timer for late joiners/refreshers
    if room_id in room_states and room_states[room_id]["is_active"]:
        remaining = room_states[room_id]["end_time"] - time.time()
        if remaining > 0:
            await websocket.send_text(json.dumps({
                "type": "SYNC_TIMER", 
                "end_time": room_states[room_id]["end_time"],
                "duration": room_states[room_id]["duration"] 
            }))

    try:
        while True:
            data = await websocket.receive_text()
            data_json = json.loads(data)
            action = data_json.get("action")
            
            if action == "START_TIMER":
                duration = int(data_json.get("duration", 25))
                end_time = time.time() + (duration * 60)
                
                room_states[room_id] = {
                    "start_time": time.time(),
                    "end_time": end_time,
                    "duration": duration, 
                    "is_active": True
                }
                
                # RESET ATTENDANCE: Everyone currently connected starts NOW
                room_attendance[room_id] = {}
                current_time = time.time()
                for conn in manager.active_connections.get(room_id, []):
                    conn["status"] = "focusing"
                    room_attendance[room_id][conn["user_id"]] = current_time
                    
                await manager.broadcast_user_list(room_id)
                await manager.broadcast({
                    "type": "TIMER_STARTED", 
                    "end_time": end_time, 
                    "duration": duration 
                }, room_id)
            
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