# 🌱 My Inner Archive

**My Inner Archive** is a private, AI-powered journaling application designed to help you capture your thoughts, reflect on your emotional patterns, and converse with your own wisdom. Instead of talking to a generic AI, your AI Companion only knows what you've written, reflecting your own words and insights back to you.

## ✨ Features

- **📝 Frictionless Journaling:** Write freely, optionally tag your context (e.g., "Walking", "Swimming", "Reflecting"), and choose your mood.
- **🤖 Personal AI Companion:** Chat with an AI that's deeply grounded in your own journal entries. It quotes you, notices patterns, and acts as a sounding board.
- **📈 Dual Mood Timeline:** See your emotional patterns over time visually. Compare your self-reported mood against the AI's tonal analysis of your written words.
- **💭 Context Insights:** A dynamic Bubble Chart shows you "Where your best thoughts come from," mapping frequency and average mood to specific activities or tags.
- **📅 "On This Day":** Automatically reminds you of journal entries you wrote on this exact day in previous years.
- **🔒 Privacy First & PIN Protected:** Quick but secure access using a custom 4-digit or 6-digit PIN. Your thoughts remain entirely private.
- **🔁 Smart AI Fallback:** Capable of running entirely locally using [Ollama](https://ollama.com/), with a seamless fallback to cloud-based Gemini (e.g., `gemini-2.5-flash`) if the local server is unavailable.

## 🛠️ Tech Stack

**Frontend**
- **React.js** (via Vite)
- Vanilla CSS (custom design system with CSS properties, glassmorphism, fluid resizing panels)
- No complex third-party charts: All charts (Line, Bubble) are built from scratch using raw SVGs and React component state.

**Backend**
- **Node.js & Express.js**
- **Supabase** (PostgreSQL) for secure database storage.
- **JSON Web Tokens (JWT) & bcrypt** for user authentication and PIN storage.
- **@google/generative-ai** (Gemini API SDK).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- A [Supabase](https://supabase.com/) account and project.
- A Google Gemini API Key.
- (Optional) [Ollama](https://ollama.com/) installed locally to run models like `llama3.2` locally.

### 1. Supabase Setup
Create the following tables in your Supabase SQL Editor:
```sql
-- Users
CREATE TABLE users (
  username TEXT PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  is_owner BOOLEAN DEFAULT FALSE,
  free_limit INTEGER DEFAULT 10,
  chat_count INTEGER DEFAULT 0,
  has_api_key BOOLEAN DEFAULT FALSE,
  custom_tags JSONB DEFAULT '[]'::jsonb,
  pin_length INTEGER DEFAULT 4
);

-- Entries
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT REFERENCES users(username) ON DELETE CASCADE,
  text TEXT NOT NULL,
  activity TEXT,
  mood INTEGER,
  mood_label TEXT,
  mood_user INTEGER,
  mood_user_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT REFERENCES users(username) ON DELETE CASCADE,
  title TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Environment Variables (`backend/.env`)
Create a `.env` file in the `backend/` directory:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
JWT_SECRET=any_long_random_string_here

# AI Configuration
AI_PROVIDER=gemini  # or "ollama" for local runs
GOOGLE_API_KEY_TRIAL=your_primary_gemini_api_key
GOOGLE_API_KEY_OWNER=your_owner_gemini_api_key
OWNER_USERNAME=your_chosen_admin_username
FREE_MESSAGE_LIMIT=10

# Ollama bounds (Optional)
OLLAMA_MODEL=llama3.2
OLLAMA_URL=http://localhost:11434
```

### 3. Running Locally

**Terminal 1: Backend**
```bash
cd backend
npm install
npm start
```

**Terminal 2: Frontend**
```bash
cd frontend
npm install
npm run dev
```

Your app will be available at `http://localhost:5173`.

## 🌐 Deployment (Vercel & Render)

**Backend (Render)**
1. Connect your repo to Render and spin up a new Web Service.
2. Root Directory: `backend/`
3. Start command: `node index.js`
4. Add all environment variables from your `.env` into the Render dashboard.

**Frontend (Vercel)**
1. Connect your repo in Vercel.
2. Under "Root Directory", type `frontend` in your Project Settings.
3. Add the following Environment Variable to your Vercel project:
   - `VITE_API_URL` = `https://your-backend-api.onrender.com`
4. Deploy!

## 💡 Philosophy
Journaling is intimate. It's easy for technology to overshadow the nuance of honest self-reflection. My Inner Archive handles AI cautiously: it serves strictly as a mirror. The application guarantees you'll never receive generic, robotic advice; it will only reflect your own history, themes, and thoughts back at you.

> *"We are the culmination of 1% of each person, each book, each movie we come across in our life... but when you start choosing that 1% consciously, then only you become what you really want."*
