# Hosting NielsAutoTrade on Pxxl.app

This guide explains how to deploy your automated trading bot to [Pxxl.app](https://pxxl.app).

## ⚠️ Important Note on Browser Automation
This project uses **Playwright** to control a browser. Most cloud platforms (including Pxxl) require specific dependencies to run browsers. 

> [!IMPORTANT]
> If Pxxl.app supports **Docker**, use the provided `Dockerfile` (see below). If it does not support Docker, you may need a VPS (like DigitalOcean) instead, as the browser requires a full Linux environment with specific libraries.

---

## 🚀 Deployment Steps (Pxxl.app)

### 1. Connect your GitHub Repository
1. Log in to your [Pxxl.app Dashboard](https://app.pxxl.app).
2. Click **Create New Project**.
3. Select your repository: `mack4pf/pocketoption-autotrading`.

### 2. Configure Build Settings
Pxxl should detect the Node.js project. Use these settings:
- **Build Command**: `npm run build && npm run install-browsers`
- **Output Directory**: (Leave blank or `.` as the server serves the build)
- **Start Command**: `npm start`

### 3. Set Environment Variables
Go to the **Environment Variables** section and add:
- `MONGODB_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A secret string for logins.
- `ADMIN_SECRET`: `1234ea1` (Match your external signals).
- `PORT`: `3011` (Or the port Pxxl provides).
- `NODE_ENV`: `production`

---

## 🐳 Option 2: Docker Deployment (Recommended)
If the standard build fails due to missing browser libraries, use a Dockerfile.

1. Create a `Dockerfile` in the root (I have added one for you).
2. Pxxl will detect the Dockerfile and build a container with the browser pre-installed.

---

## 🔒 Post-Deployment Checklist
1. **IP Whitelisting**: Get your server's IP from the Pxxl dashboard and add it to your **MongoDB Atlas Network Access**.
2. **Health Check**: Visit `https://your-app.pxxl.app/health` to verify the system is running.
3. **Admin Panel**: Log in to your dashboard and verify you can launch a browser.

---
Need help? Check the [Pxxl status page](https://pxxl.app) or contact their support.
