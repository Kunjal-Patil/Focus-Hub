# 🌱 Focus Hub

**A full-stack, gamified real-time productivity platform for collaborative focus sessions.**

Join synchronized focus rooms, watch your plant grow as you work, chat live with your room, and climb a global leaderboard — all while a strict anti-cheat system keeps everyone honest.

![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/frontend-React-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/backend-FastAPI-009688?logo=fastapi&logoColor=white)
![WebSockets](https://img.shields.io/badge/realtime-WebSockets-black)

---

## ✨ Overview

Focus Hub turns solo productivity into a shared, game-like experience. Create or join a focus room, start a synchronized timer, and watch a live SVG plant grow in real time as you and your roommates stay on task — with presence tracking, live chat, and a global leaderboard to keep the motivation going.

---

## 🚀 Core Features

### 🔴 Real-Time Collaboration
Powered by FastAPI WebSockets for true bi-directional communication:
- Live status tracking and active user presence across all connected clients
- Real-time room messaging with instant delivery
- Synchronized focus timers so every participant sees the same state

### 🎮 Gamified User Experience
- Interactive React frontend with dynamic SVG animations
- A plant that visually grows in real time as your focus timer progresses — the longer you focus, the more it flourishes

### 🛡️ Strict-Mode Focus Enforcement
- Tab-visibility tracking holds users accountable when they navigate away mid-session
- Battery-saver overlay for extended sessions, reducing visual load without breaking focus tracking

### 🕵️ Anti-Cheat Attendance Tracking
- Persistent backend tracking system that accurately calculates real user presence
- Prevents multi-claim exploits (no double-dipping on session credit)
- Gracefully recovers from unexpected page refreshes without losing progress

### 🔐 Security & Analytics
- All REST endpoints and WebSocket connections secured with JWT authentication
- Long-term statistics persisted via SQLAlchemy ORM
- Aggregated stats power a competitive global leaderboard

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, Tailwind CSS |
| **Backend & Networking** | FastAPI, WebSockets |
| **Database & Auth** | SQLAlchemy ORM, JWT |

---

## 📂 Project Structure

```
focus-hub/
├── backend/
│   ├── models.py/
│   ├── database.py/
│   └── main.py
│   ├── requirements.txt
│   └── alembic/             # DB migrations
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components (Plant, Timer, Chat, etc.)
│   │   ├── hooks/          # WebSocket & timer hooks
│   │   ├── main.jsx/
│   │   └── App.jsx
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- A running PostgreSQL (or your configured SQL database)

### 1. Clone the repo
```bash
git clone https://github.com/Kunjal-Patil/focus-hub.git
cd focus-hub
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app
Visit `http://localhost:5173` (or your configured Vite port) and start focusing 🌱

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Connection string for your SQL database |
| `JWT_SECRET` | Secret key used to sign JWT tokens |
| `JWT_ALGORITHM` | Algorithm used for JWT (e.g. `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry duration |

---

## 🗺️ Roadmap

- [ ] Custom room themes and plant species
- [ ] Friend system and private leaderboards
- [ ] Mobile-responsive PWA support
- [ ] Session analytics dashboard

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 💬 Acknowledgments

Built for anyone who's ever needed a little accountability — and a little plant — to get through a deep work session.
