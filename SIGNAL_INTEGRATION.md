# NielsAutoTrade Signal Integration Guide

This document explains how to send signals from an external application (like TradingView via Webhooks or a Python bot) to the **NielsAutoTrade** platform.

## 🔐 Authentication
All external requests MUST include the `X-Admin-Secret` header for authorization.

**Header Name:** `X-Admin-Secret`  
**Header Value:** `1234ea1` (Match the value in your `.env` file)

---

## 📡 1. Sending a Trade Signal
To trigger a trade for all active users, send a `POST` request to the `/api/signals/create` endpoint.

**Endpoint:** `POST https://your-server-url.com/api/signals/create`

### Request Format (External Adapter)
The system automatically adapts to this format:
```json
{
  "ticker": "EURUSD-OTC",
  "signal": "BUY",
  "price": 1.0850,
  "time": 300
}
```

### Request Format (Internal)
```json
{
  "asset": "EURUSD-OTC",
  "direction": "call",
  "time": 300
}
```

**Parameters:**
- `asset` / `ticker`: The asset name (e.g., `EURUSD`, `EURUSD-OTC`).
- `direction` / `signal`: `BUY`, `CALL`, `UP` or `SELL`, `PUT`, `DOWN`.
- `time`: Expiration time in seconds (Default: 300).

---

## 📊 2. Sending Trade Results (For Martingale)
To update the Martingale sequence for users, you must send the result of the signal once the trade timeframe expires.

**Endpoint:** `POST https://your-server-url.com/api/signals/result`

### Request Format
```json
{
  "signalId": "SIG_EURUSD_1766...",
  "signal": "WIN"
}
```

**Parameters:**
- `signalId`: (Optional) The ID returned when you created the signal.
- `signal` / `outcome`: `WIN` or `LOSS`.

---

## 🚀 Deployment Instructions

### 1. GitHub Push
Ensure your `.env` file is NOT pushed to GitHub (added to `.gitignore`).
```bash
git add .
git commit -m "Final production-ready release"
git push origin main
```

### 2. DigitalOcean / Railway / VPS Setup
1. Clone the repository on your server.
2. Install dependencies: `npm install && cd frontend && npm install && cd ..`.
3. Build the frontend: `cd frontend && npm run build && cd ..`.
4. Setup `.env` on the server with your production `MONGODB_URI` and `ADMIN_SECRET`.
5. Start the server: `npm start` (or use `pm2 start server.js`).

---

## 🛠️ Troubleshooting
- **401 Unauthorized**: Ensure the `X-Admin-Secret` header exactly matches the `.env` value.
- **503 Error**: Check MongoDB Atlas IP Whitelisting for your production server's IP.
- **Signals Not Trading**: Ensure users have **Auto-Trading** toggled ON in their dashboard.
