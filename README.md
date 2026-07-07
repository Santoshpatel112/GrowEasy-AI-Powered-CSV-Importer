# GrowEasy AI-Powered CSV Importer

An intelligent CSV data importer built as a full-stack Javascript application (Next.js 16 + Express + TypeScript) that extracts and maps arbitrary spreadsheet columns to a standardized CRM lead format using Google Gemini.

---

## 🔗 Live URLs
- **GitHub Repository**: [https://github.com/Santoshpatel112/GrowEasy-AI-Powered-CSV-Importer](https://github.com/Santoshpatel112/GrowEasy-AI-Powered-CSV-Importer)
- **Hosted Frontend Dashboard**: [https://grow-easy-ai-powered-csv-importer.vercel.app/](https://grow-easy-ai-powered-csv-importer.vercel.app/)
- **Hosted Backend API**: [https://groweasy-ai-powered-csv-importer.onrender.com/health](https://groweasy-ai-powered-csv-importer.onrender.com/health)

---

## 🚀 How to Run Locally

### 1. Run the Backend API
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY` in the `.env` file.
4. Start the backend:
   ```bash
   npm run dev
   ```
   The backend API will run on `http://localhost:5005`.

### 2. Run the Frontend Dashboard
1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js dev server:
   ```bash
   npm run dev
   ```
   The dashboard will run on `http://localhost:3002`.

---

## 🌐 How to Deploy (Production)

### 1. Backend (Render)
1. Go to [Render](https://render.com) and create a new **Web Service**.
2. Connect your GitHub repository.
3. Configure these settings:
   - **Root Directory**: `backend`
   - **Language/Runtime**: `Docker` (Render automatically uses the multi-stage `backend/Dockerfile`)
   - **Instance Type**: `Free ($0/month)`
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *Your Gemini API Key*
5. Click **Deploy**. Copy the live API URL once done (e.g. `https://groweasy-ai-powered-csv-importer.onrender.com`).

### 2. Frontend (Vercel)
1. Go to [Vercel](https://vercel.com) and import your repository.
2. Configure these settings:
   - **Root Directory**: Select `frontend`
3. Under **Environment Variables**, add:
   - **Key**: `NEXT_PUBLIC_BACKEND_URL`
   - **Value**: *Your Render API URL* (e.g. `https://groweasy-ai-powered-csv-importer.onrender.com`)
4. Click **Deploy**!

---

## 🌟 Key Features Implemented
- **Interactive Column Mapping Grid**: Matches CSV columns to standard CRM fields automatically using heuristics. Users can manually change mapping via dropdown selectors.
- **AI Standardization**: Normalizes and parses raw rows using structured JSON schemas in Google Gemini.
- **Validation & Skip Rules**: Automatically skips rows missing both email and phone coordinates, highlighting the reason in a dedicated skipped leads tab.
- **Decoupled Monorepo Architecture**: Clean separation between frontend layout and backend logic.
- **Docker Compose Setup**: Run the whole stack locally with a single command: `docker-compose up --build`.
