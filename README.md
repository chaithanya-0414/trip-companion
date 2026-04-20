# TripSync AI — Group Travel Companion

> AI-powered end-to-end group travel management for 10–20 people, up to 21 days.  
> **Stack**: React + Tailwind CSS · FastAPI · LangChain + Gemini · Firebase

---

## 🏗️ Project Structure

```
trip-companion/
├── frontend/          ← React + Tailwind (Vite)
└── backend/           ← FastAPI + LangChain Agent
```

---

## 🔥 Step 1 — Firebase Setup (Required)

1. Go to [Firebase Console](https://console.firebase.google.com/) → **Create a new project**
2. Enable the following:
   - **Authentication** → Email/Password
   - **Firestore Database** → Start in test mode
   - **Storage** → Start in test mode

3. **Get Frontend Config**:  
   Project Settings → General → Your Apps → Add Web App → Copy config  
   Paste into `frontend/src/services/firebase.js` replacing the placeholder values.

4. **Get Backend Service Account**:  
   Project Settings → Service Accounts → Generate New Private Key  
   Save as `backend/firebase-service-account.json`

5. **Firestore Rules** (for production):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

---

## 🖥️ Frontend Setup

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Environment (optional `.env`)
```
VITE_API_URL=http://localhost:8000
```

---

## ⚙️ Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

The `.env` file already has your Gemini API key pre-filled.  
All you need to add is `firebase-service-account.json`.

```bash
uvicorn main:app --reload --port 8000
# → http://localhost:8000
# → Docs at http://localhost:8000/docs
```

---

## 🚀 Deployment

### Frontend → Vercel

1. Push `frontend/` to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Set build settings:
   - Build command: `npm run build`
   - Output dir: `dist`
4. Add env var: `VITE_API_URL = https://your-backend.onrender.com`

### Backend → Render

1. Push `backend/` to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Set env vars in dashboard:
   - `GOOGLE_API_KEY` = your Gemini key
   - `CORS_ORIGINS` = `https://your-app.vercel.app`
4. Upload `firebase-service-account.json` as a **Secret File** at path `./firebase-service-account.json`

---

## 💬 AI Chat Commands (Examples)

| Command | Action |
|---|---|
| `Plan a 7-day Manali trip for 12 people under ₹20k` | Generates full itinerary |
| `Add ₹1200 lunch paid by Ravi` | Logs expense |
| `Show all food expenses` | Filtered expense list |
| `Who owes whom?` | Settlement calculation |
| `Admin approve expense abc123` | Admin approves |
| `Show day 3 plan` | Day 3 itinerary |
| `How much has Priya spent?` | Per-person breakdown |

---

## 👤 Roles

| Role | Permissions |
|---|---|
| **Admin** | All features + Approve/Reject expenses + Edit itinerary + Add members |
| **User** | View dashboard, Add expenses, View settlements, Chat with AI |

---

## 📊 Features

- ✅ **Day-wise AI itinerary** (up to 21 days) via Gemini
- ✅ **Expense tracking** with categories & receipt upload
- ✅ **Smart settlements** — minimizes number of transactions
- ✅ **Admin approval** workflow with receipt review  
- ✅ **AI Chat** — natural language commands for all operations
- ✅ **Real-time** data via Firebase Firestore
- ✅ **Role-based** access control (admin/user)

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, Uvicorn |
| AI Agent | LangChain, Google Gemini 1.5 Pro |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |
