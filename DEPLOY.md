# Free Deployment Guide — Railway

This guide deploys:
- **Frontend** (Angular 21) → Railway service
- **Backend** (Laravel 12 / PHP 8.2) → Railway service  
- **Database** (MySQL 8.0) → Railway MySQL plugin
- **Cache** (Redis) → Railway Redis plugin

Total cost: **Free** (Railway Hobby plan gives $5/month credit — enough for this stack)

---

## Prerequisites

1. **GitHub account** — push this repo to GitHub first
2. **Railway account** — sign up free at https://railway.app using GitHub

---

## Step 1 — Push to GitHub

If not already on GitHub, run these commands in your project root:

```bash
git init          # skip if already a git repo
git add .
git commit -m "prepare for Railway deployment"
git remote add origin https://github.com/YOUR_USERNAME/gym-management-system.git
git push -u origin main
```

---

## Step 2 — Create Railway Project

1. Go to https://railway.app → **New Project**
2. Choose **Deploy from GitHub repo**
3. Select your `gym-management-system` repo

---

## Step 3 — Add MySQL Database

1. In your Railway project, click **+ New** → **Database** → **MySQL**
2. Railway creates a MySQL instance automatically
3. Click on the MySQL service → **Variables** tab — note the connection variables

---

## Step 4 — Add Redis

1. Click **+ New** → **Database** → **Redis**
2. Railway creates Redis automatically

---

## Step 5 — Deploy the Backend (gym-api)

1. Click **+ New** → **GitHub Repo** → select your repo
2. When asked for the root directory, set it to: `gym-api`
3. Railway will detect the Dockerfile automatically

### Set Backend Environment Variables

In the backend service → **Variables** tab, add ALL of these:

| Variable | Value |
|---|---|
| `APP_NAME` | GymManagement |
| `APP_ENV` | production |
| `APP_DEBUG` | false |
| `APP_KEY` | *(click Generate — or run `php artisan key:generate --show`)* |
| `APP_URL` | *(your backend Railway URL — set after first deploy)* |
| `DB_CONNECTION` | mysql |
| `DB_HOST` | `${{MySQL.MYSQL_HOST}}` |
| `DB_PORT` | `${{MySQL.MYSQL_PORT}}` |
| `DB_DATABASE` | `${{MySQL.MYSQL_DATABASE}}` |
| `DB_USERNAME` | `${{MySQL.MYSQL_USER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQL_PASSWORD}}` |
| `REDIS_HOST` | `${{Redis.REDIS_HOST}}` |
| `REDIS_PASSWORD` | `${{Redis.REDIS_PASSWORD}}` |
| `REDIS_PORT` | 6379 |
| `SESSION_DRIVER` | database |
| `CACHE_STORE` | database |
| `QUEUE_CONNECTION` | sync |
| `LOG_CHANNEL` | stderr |
| `MAIL_MAILER` | smtp |
| `MAIL_HOST` | smtp.gmail.com |
| `MAIL_PORT` | 587 |
| `MAIL_USERNAME` | your-email@gmail.com |
| `MAIL_PASSWORD` | your-gmail-app-password |
| `MAIL_ENCRYPTION` | tls |
| `MAIL_FROM_ADDRESS` | your-email@gmail.com |
| `GOOGLE_CLIENT_ID` | *(your value)* |
| `GOOGLE_CLIENT_SECRET` | *(your value)* |
| `FACEBOOK_CLIENT_ID` | *(your value)* |
| `FACEBOOK_CLIENT_SECRET` | *(your value)* |
| `GITHUB_CLIENT_ID` | *(your value)* |
| `GITHUB_CLIENT_SECRET` | *(your value)* |
| `STRIPE_KEY` | *(your value)* |
| `STRIPE_SECRET` | *(your value)* |
| `GEMINI_API_KEY` | *(your value)* |
| `HF_TOKEN` | *(your value)* |

> **Tip**: For `${{MySQL.MYSQL_HOST}}` syntax — Railway auto-resolves these from the MySQL plugin. Just type them exactly as shown.

4. After setting variables, Railway will redeploy automatically
5. Once deployed, copy the backend URL (e.g. `https://gym-api-production.up.railway.app`)
6. Update `APP_URL` variable to that URL

---

## Step 6 — Deploy the Frontend (gym-UI)

1. Click **+ New** → **GitHub Repo** → select your repo again
2. Set root directory to: `gym-UI`
3. Railway detects the Dockerfile

### Set Frontend Environment Variables

| Variable | Value |
|---|---|
| `API_URL` | `https://your-backend-url.up.railway.app` *(no trailing slash, no /api)* |

The Docker entrypoint script will inject this URL into the built Angular app at startup.

---

## Step 7 — Update Social Login Redirect URIs

After you have your backend URL, update these in the Railway backend variables:

```
GOOGLE_REDIRECT_URI=https://your-backend.up.railway.app/api/auth/google/callback
FACEBOOK_REDIRECT_URI=https://your-backend.up.railway.app/api/auth/facebook/callback
GITHUB_REDIRECT_URI=https://your-backend.up.railway.app/api/auth/github/callback
```

Also update the redirect URIs in:
- Google Cloud Console
- Facebook Developer Portal  
- GitHub OAuth App settings

---

## Step 8 — Verify Deployment

1. Visit your frontend URL — the app should load
2. Try logging in — it should hit the backend
3. Check Railway logs if anything fails: service → **Deployments** → **View Logs**

---

## Troubleshooting

**Backend 500 errors**: Check logs, usually a missing env variable or migration issue

**CORS errors**: The backend already allows all origins (`*`). If you want to restrict it, set `FRONTEND_URL` and update `config/cors.php`

**Frontend shows blank page**: Check browser console — likely `API_URL` env var not set correctly

**Migrations failed**: SSH into the service via Railway CLI and run `php artisan migrate --force`

---

## Railway CLI (optional but useful)

```bash
npm install -g @railway/cli
railway login
railway link          # link to your project
railway logs          # tail logs
railway run php artisan migrate  # run commands in production
```
