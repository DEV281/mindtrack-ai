# Deploy MindTrack AI for Free

## Prerequisites (all free)
- GitHub account
- Railway account (railway.app)
- Vercel account (vercel.com)
- Supabase account (supabase.com)
- Upstash account (upstash.com)
- Groq API key (console.groq.com)

---

## Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: MindTrack AI v4 initial release"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mindtrack-ai.git
git push -u origin main
```

---

## Step 2 — Get Free Database (Supabase)

1. Go to supabase.com → New Project
2. Choose free tier → Create project
3. Go to Settings → Database
4. Copy Connection String (URI format)
5. Replace `[YOUR-PASSWORD]` with your password
6. Your DATABASE_URL will look like:
   ```
   postgresql+asyncpg://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
   ```

---

## Step 3 — Get Free Redis (Upstash)

1. Go to upstash.com → Create Database
2. Choose free tier → Redis → Create
3. Copy Redis URL from dashboard
4. Your REDIS_URL will look like:
   ```
   redis://default:PASSWORD@ENDPOINT.upstash.io:PORT
   ```

---

## Step 4 — Get Free Groq API Key

1. Go to console.groq.com
2. Sign up free
3. API Keys → Create API Key
4. Copy key starting with `gsk_`

---

## Step 5 — Generate Secret Key

Run this command and copy the output:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Step 6 — Get Gmail App Password (for OTP email)

1. Go to myaccount.google.com
2. Security → 2-Step Verification → App passwords
3. Create app password for "Mail"
4. Copy the 16-character password

---

## Step 7 — Deploy Backend to Railway

1. Go to railway.app → New Project
2. Click Deploy from GitHub repo
3. Select your mindtrack-ai repository
4. Set Root Directory to: `backend`
5. Railway will auto-detect Dockerfile

6. Add environment variables in Railway dashboard:
   Click your service → Variables → Add all of these:

   ```
   GROQ_API_KEY          = gsk_your_key
   ANTHROPIC_API_KEY     = sk-ant-your_key (optional)
   DATABASE_URL          = postgresql+asyncpg://... (from Supabase)
   REDIS_URL             = redis://... (from Upstash)
   SECRET_KEY            = your_generated_secret
   SMTP_USER             = your@gmail.com
   SMTP_PASSWORD         = your_app_password
   FRONTEND_URL          = https://mindtrack-ai.vercel.app
   DEMO_MODE             = true
   ACCESS_TOKEN_EXPIRE_MINUTES = 30
   REFRESH_TOKEN_EXPIRE_DAYS   = 30
   ```

7. Click Deploy
8. Wait 2-3 minutes for build
9. Copy your Railway URL:
   ```
   https://mindtrack-backend-XXXXX.railway.app
   ```

10. Test it works:
    ```bash
    curl https://mindtrack-backend-XXXXX.railway.app/health
    # Should return: {"status":"healthy"}
    ```

---

## Step 8 — Deploy Frontend to Vercel

1. Go to vercel.com → Add New Project
2. Import your GitHub repository
3. Set Root Directory to: `frontend`
4. Framework: Vite

5. Add environment variables:
   ```
   VITE_API_URL = https://mindtrack-backend-XXXXX.railway.app
   VITE_WS_URL  = wss://mindtrack-backend-XXXXX.railway.app
   ```

6. Click Deploy
7. Wait 1-2 minutes
8. Your app is live at:
   ```
   https://mindtrack-ai.vercel.app
   ```

---

## Step 9 — Run Database Migrations

After Railway deploys, run migrations:

**Option A** (Railway CLI):
```bash
npm install -g @railway/cli
railway login
railway run --service mindtrack-backend \
  python -m alembic upgrade head
```

**Option B** (Railway dashboard):
Go to your backend service → Click Deploy → Start Command
Change to: `alembic upgrade head && uvicorn main:app ...`
(this runs migrations automatically on every deploy)

---

## Step 10 — Set Up GitHub Secrets for CI/CD

Go to GitHub repo → Settings → Secrets → Actions
Add these secrets:

```
RAILWAY_TOKEN     = from railway.app account settings
VERCEL_TOKEN      = from vercel.com account settings
VERCEL_ORG_ID     = from vercel.com project settings
VERCEL_PROJECT_ID = from vercel.com project settings
VITE_API_URL      = https://mindtrack-backend-XXXXX.railway.app
VITE_WS_URL       = wss://mindtrack-backend-XXXXX.railway.app
GROQ_API_KEY      = gsk_your_groq_key
```

After this, every `git push` to `main` will:
- ✅ Run tests automatically
- ✅ Deploy backend to Railway
- ✅ Deploy frontend to Vercel

---

## Step 11 — Test Your Live App

1. Open https://mindtrack-ai.vercel.app
2. Click Demo Login
3. CAPTCHA auto-solves
4. Check OTP on screen (DEMO_MODE=true shows it)
5. Enter OTP → you are in
6. Test: Start Session → allow camera + mic
7. Test: Talk to AI → send a message
8. Test: My Journey → view reports

---

## Your Free Limits

| Service   | Free Limit              | Notes               |
|-----------|------------------------|---------------------|
| Vercel    | 100GB bandwidth/month  | Unlimited deploys   |
| Railway   | $5 credit/month        | ~500 hours backend  |
| Supabase  | 500MB database         | 2 free projects     |
| Upstash   | 10,000 requests/day    | Enough for testing  |
| Groq      | 14,400 requests/day    | Very generous       |
| GitHub    | Unlimited public repos | Free CI/CD          |

---

## Custom Domain (Optional, Free)

Vercel free tier supports custom domains:
1. Buy domain (~$10/year from Namecheap/Cloudflare)
2. Vercel → Project → Domains → Add domain
3. Update `FRONTEND_URL` in Railway env vars
4. Update CORS in backend `main.py`

---

## Troubleshooting

**Backend not starting:**
- Check Railway logs → click your service → Logs
- Most common: DATABASE_URL wrong format
- Fix: must start with `postgresql+asyncpg://` not `postgresql://`

**Frontend not connecting to backend:**
- Check `VITE_API_URL` in Vercel env vars
- Must be `https://` not `http://`
- Redeploy frontend after changing env vars

**WebSocket not connecting:**
- Check `VITE_WS_URL` starts with `wss://` not `ws://`
- Railway supports WebSockets on all plans

**OTP not arriving in email:**
- Check `SMTP_PASSWORD` is app password not account password
- Enable 2-step verification first in Gmail
- Check spam folder

**Camera/mic not working in production:**
- MUST be HTTPS — both Vercel and Railway use HTTPS
- Should work automatically on live deployment

---

## Update Your Resume

Add this to your resume:
```
Live URL: https://mindtrack-ai.vercel.app
GitHub: https://github.com/YOUR_USERNAME/mindtrack-ai
```
