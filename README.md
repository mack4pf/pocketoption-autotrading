# NielsAutoTrade: Pocket Option Automation Bot

NielsAutoTrade is a high-performance, secure, and automated trading bridge for Pocket Option. It enables users to execute signals from external sources (like TradingView) using advanced strategies like Martingale multiplier and real-time browser synchronization.

## 🚀 Key Features

- **Automated Execution**: Seamlessly connects to Pocket Option via a controlled browser session to place trades with zero delay.
- **Advanced Martingale System**: Customizable multiplier strategy (Level 0-6) that automatically calculates stakes after wins or losses.
- **Real-Time Dashboard**: Monitor live signal logs, active connection status, and execution history in a premium dark-mode interface.
- **Signal Integration Adapter**: Built-in support for external signal providers through a secure authenticated API.
- **Multi-User Architecture**: Designed to handle multiple concurrent trading sessions independently.
- **Safe Mode & Risk Management**: Integrated risk advice and stakeholder limits to protect user capital.

## 🛠️ Tech Stack

- **Backend**: Node.js, Express, Mongoose (MongoDB)
- **Frontend**: React, Vite, Tailwind CSS, Socket.io
- **Automation Engine**: Playwright (Browser Automation)
- **Real-time Communication**: Socket.io for live status updates

## 📦 Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/mack4pf/pocketoption-autotrading.git
cd pocketoption-autotrading
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the root directory and add:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_SECRET=1234ea1
PORT=3011
```

### 4. Running the Application
```bash
# Start both Backend and Frontend in development mode
npm run dev
```

## 📡 Signal Integration

To send signals from external apps (TradingView, Python bots, etc.), send a POST request with the `X-Admin-Secret` header.

**Endpoint:** `POST /api/signals/create`
**Header:** `X-Admin-Secret: 1234ea1`

```json
{
  "ticker": "EURUSD-OTC",
  "signal": "BUY",
  "time": 300
}
```

For detailed documentation, see [SIGNAL_INTEGRATION.md](./SIGNAL_INTEGRATION.md).

## 🛡️ Security & Roles
- **Admins**: Can broadcast signals and manage the system.
- **Users**: Can connect their own Pocket Option accounts, set trade amounts, and toggle auto-trading.

## ⚖️ License
This project is for educational and authorized professional use only. Performance is subject to market conditions.

---
Developed with ❤️ for NielsAutoTrade.
