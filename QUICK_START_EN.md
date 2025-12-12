# ⚡ PatentFlow Enterprise - Quick Start (English)

Follow these steps to run the app locally with the new one-click starter. Manual commands are also provided as a fallback.

## ✅ Prerequisites
- Node.js 18+ with npm
- Python 3.9+ (only if you plan to run the optional desktop client)
- ~10 GB free disk space

## 🚀 One-Click Start (Recommended)
1. Open a terminal and change into the project root (where `package.json` lives).
2. Run the starter script:
   ```bash
   npm run one-click-start
   ```
3. Wait for the script to:
   - Check Node.js/npm availability
   - Create `.env.local` with sample values if missing
   - Install dependencies for the web app and collaboration service
   - Apply the Prisma schema to the local SQLite database
   - Launch the web app on http://localhost:3000 and the collaboration service on port 3003
   - Keep everything local: no external APIs or cloud calls are used.
4. Keep the terminal open while you use the app. Press **Ctrl+C** to stop all services together.

## 🔄 Manual Start (If You Prefer Running Commands Yourself)
1. Install dependencies and set up the database in the project root:
   ```bash
   npm install
   npm run db:push
   ```
2. Start the web app:
   ```bash
   npm run dev
   ```
3. In a new terminal, start the collaboration service:
   ```bash
   cd mini-services/collaboration-service
   npm install
   npm run dev
   ```

## 🔑 Login
- Email: `admin@patentflow.com`
- Password: `admin123`

## 🧪 Quick Checks After Launch
- Visit http://localhost:3000 and log in.
- Open http://localhost:3000/dashboard to confirm authenticated routes work.
- (Optional) Open two browser windows at http://localhost:3000/collaboration to verify real-time sync.

## 🛠️ Troubleshooting
- **Port in use**: stop other apps using ports 3000 or 3003 (e.g., `lsof -i :3000`).
- **Dependency issues**: remove `node_modules` and rerun the one-click script or `npm install`.
- **Database reset**: delete the local SQLite DB (if present) and run `npm run db:push`.

## 🖥️ Optional Desktop Client
If you want the desktop client, go to `desktop-app`, create/activate a Python virtual environment, install `requirements.txt`, and run `python main.py` while the web app is running.
