# GrowEasy AI-Powered CSV Importer

An intelligent CSV data importer built as a full-stack Javascript application (Next.js 16 + Express + TypeScript) that extracts and maps arbitrary spreadsheet columns to a standardized CRM lead format using LLMs (Gemini / OpenAI).

---

## 🔗 Live URLs
- **GitHub Repository**: [https://github.com/Santoshpatel112/GrowEasy-AI-Powered-CSV-Importer](https://github.com/Santoshpatel112/GrowEasy-AI-Powered-CSV-Importer)
- **Hosted Frontend Dashboard**: [https://grow-easy-ai-powered-csv-importer.vercel.app/](https://grow-easy-ai-powered-csv-importer.vercel.app/)
- **Hosted Backend API**: [https://groweasy-ai-powered-csv-importer.onrender.com/health](https://groweasy-ai-powered-csv-importer.onrender.com/health)

---

## 🛠 Tech Stack

| Layer | Technology | Key Modules & Packages |
|---|---|---|
| **Frontend** | **Next.js 16** (App Router, TypeScript) | Vanilla CSS Modules, Lucide React (Icons) |
| **Backend** | **Node.js 26** (Express, TypeScript) | Multer (In-memory upload), CSV Parser, Dotenv |
| **AI Matching** | **Google Gemini** (Primary), **OpenAI** (Fallback) | `@google/genai` (SDK 2.10+), `openai` (v6+) |
| **DevOps** | **Docker** & **Docker Compose** | Multi-stage production builds |

---

## 🌟 Core Features & Ingestion Wizard

### Step 1 — Drag & Drop Upload
- An interactive, animated upload zone supporting **Drag & Drop** files or file dialog picker.
- Client-side checks ensure only `.csv` lists are accepted.

### Step 2 — Real-time Preview Table
- Instantly parses the CSV data on the server without doing any AI calls yet.
- Displays rows inside a premium data table featuring:
  - **Sticky headers** (header columns remain locked during vertical scrolls).
  - **Horizontal and vertical scrolling** with custom styled sleek scrollbars.
  - Interactive cell inspection on hover.

### Step 3 — Schema Confirmation
- Highlights the target GrowEasy CRM lead fields that the AI engine will extract.
- Prompts user to start the AI analysis pipeline.
- Simulates an **incremental batch progress indicator** (e.g. "Processing batch 1 of 3...") to provide real-time feedback during network requests.

### Step 4 — Parsed Ingestion Dashboard
- Aggregates the results into stats: **Total Processed**, **Successfully Mapped**, and **Skipped Rows**.
- Splits outputs into two tabs:
  - **Standardized Leads Table**: Mapped leads in correct CRM format.
  - **Skipped / Invalid Rows Table**: Shows skipped rows and explains why (e.g., "Missing both email and mobile number").

---

## 🧠 AI Engine & Ingestion Rules

The backend AI service uses structured response generation schemas (`responseMimeType: "application/json"`) to map headers dynamically:
1. **Required Fields Check**: If a record has **neither a valid email nor mobile number**, it is automatically skipped.
2. **Contact Merging**: If multiple emails or mobile numbers are found, the first one is used as the main value, and the rest are merged into `crm_note`.
3. **Data Source Validation**: Restricts source values confidently to: `leads_on_demand`, `meridian_tower`, `eden_park`, `varah_swamy`, `sarjapur_plots` (empty if none match).
4. **CRM Status Ingestion**: Categorizes leads strictly into: `GOOD_LEAD_FOLLOW_UP`, `DID_NOT_CONNECT`, `BAD_LEAD`, `SALE_DONE`.
5. **Escape Newlines**: Sanitizes multiline strings so that each lead remains a single valid CSV row.
6. **Automatic Retry**: If a batch request to the AI service fails due to rate limits or API hiccups, it immediately retries once before logging a fallback skip.
7. **Rule-Based Mock Fallback**: In the absence of API keys, a heuristic regex-based matching algorithm runs automatically, allowing local evaluation without costing API credits.

---

## 📂 Project Structure

```
groweasy-csv-importer/
├── docker-compose.yml
├── README.md
│
├── backend/                    # Node.js/Express API (TypeScript)
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── server.ts           # Bootstraps Express and CORS settings
│       ├── routes.ts           # Upload & Ingestion controllers
│       ├── types/
│       │   └── index.ts        # Shared TypeScript interfaces
│       ├── services/
│       │   └── ai.ts           # Gemini/OpenAI connectors & mapping prompt
│       └── tests/
│           └── ai.test.ts      # Native unit tests for ingestion rules
│
└── frontend/                   # Next.js SPA Client (TypeScript)
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    └── src/
        └── app/
            ├── layout.tsx      # Main layout with anti-flicker theme injector
            ├── page.tsx        # Responsive Ingestion Dashboard and wizard logic
            └── globals.css     # CSS variables, animations, scrollbars
```

---

## 🛠 Local Setup & Running Instructions

### Prerequisites
- Node.js v18+ and npm
- Docker (optional, for container runs)

### Running with Docker Compose (Quickest)
1. Set up your environment keys in the root shell:
   ```bash
   export GEMINI_API_KEY="your-gemini-key"
   ```
2. Run Compose:
   ```bash
   docker-compose up --build
   ```
3. Open `http://localhost:3000` in your browser. The backend will list on `http://localhost:5005`.

---

### Running Manually

#### 1. Start the Backend
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
   Provide your `GEMINI_API_KEY` (or `OPENAI_API_KEY`) in `.env`.
4. Run in dev mode:
   ```bash
   npm run dev
   ```
   The backend API will boot on `http://localhost:5005`.

5. Run test suite:
   ```bash
   npm run test
   ```

#### 2. Start the Frontend
1. Open a new terminal window and navigate to the frontend folder:
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
4. Navigate to `http://localhost:3000` in your browser.

---

## 🏆 Bonus Implementations Done
- [x] **Drag & Drop Zone** with state-aware active drops.
- [x] **Dark / Light Theme Toggle** with persistent `localStorage` cache and flicker-free page headers.
- [x] **AI Batch Processing** (chunking files to respect context limit and rate bounds).
- [x] **Auto-Retry Mechanisms** for failed AI batches.
- [x] **Native Node Unit Tests** validating the parsing correctness.
- [x] **Docker Integration** (multi-stage optimized images and compose orchestration).

---

## 📬 Submission Checklist
- **Position Applied**: Software Developer (Full-Time)
- **Email Subject**: Software Developer Application — Santosh Patel
- **Sent to**: `varun@groweasy.ai`
# GrowEasy-AI-Powered-CSV-Importer
