# AcneVision AI: Real-Time Acne Detection System (Backend)

High-performance, asynchronous REST API and inference engine backend for **AcneVision AI**, built with **Python 3.11+**, **FastAPI**, and **Ultralytics YOLOv8 / YOLO11**.

---

## 🚀 Key Architectural Features

- **High Concurrency & Non-Blocking Inference**: Utilizes a dedicated thread pool executor (`concurrent.futures.ThreadPoolExecutor`) to offload CPU/GPU-bound YOLO operations, serving >50 simultaneous inference requests without blocking the FastAPI event loop.
- **Sub-100ms Latency SLA**: Pre-warm cycle on startup, zero-disk in-memory decoding via `io.BytesIO`, and native support for ONNX Runtime (`.onnx`) and PyTorch (`.pt`).
- **Privacy & UU PDP Compliance (UU No. 27/2022)**:
  - **Zero Raw Image Persistence**: Facial images are strictly held in volatile memory during inference and never saved to disk or public object buckets.
  - **Magic-Byte Header Validation**: Rejects spoofed MIME types and malicious payloads (`image/jpeg`, `image/png`, `image/webp`).
  - **Sanitized Telemetry**: Structured JSON audit logs record latency and detection counts with zero PII or raw image leakage.
- **Dual API Compatibility**: Serves both strict SRS endpoints (`/api/v1/detect/image`, `/api/v1/capture/classify`) and frontend-direct endpoints (`/api/v1/detect`, `/api/v1/analyze`).
- **Fault-Tolerant Classifier Handoff**: Resilient outbound HTTP client (`httpx.AsyncClient`) with automatic local fallback when external classifier is unreachable.

---

## 👥 Test Accounts (Seeded Credentials)

When the backend initializes, it automatically seeds 3 ready-to-use test accounts into the persistent SQLite database:

| Account Type | Email | Password | Role | Description |
|---|---|---|---|---|
| **Admin** | `admin@acnevision.test` | `admin12345` | `admin` | Full admin panel access, user management, audit logs, and model performance metrics. |
| **Demo User** | `demo@acnevision.test` | `demo12345` | `user` | Standard user for mobile camera scans, history tracking, and consultations. |
| **Patient** | `pasien@acnevision.test` | `pasien12345` | `user` | Clinical test profile for evaluating severity history and custom patient notes. |

---

## 🔑 Authentication & Account Endpoints

- **`POST /api/v1/auth/register`**: Register new user account with `email`, `password`, and `full_name`.
- **`POST /api/v1/auth/login`**: Authenticate credentials and receive signed JWT Bearer access token.
- **`POST /api/v1/auth/logout`**: Stateless logout acknowledgment.
- **`GET /api/v1/me`**: Get current authenticated user profile (`id`, `email`, `full_name`, `role`, `status`, `created_at`).
- **`PATCH /api/v1/me`**: Update current user's profile (`full_name`, `avatar_url`).
- **`GET /api/v1/me/stats`**: Aggregate user scan history and latest Hayashi severity metrics.
- **`GET /api/v1/admin/users`**: (Admin only) Paginated list of registered users.
- **`PATCH /api/v1/admin/users/{user_id}`**: (Admin only) Modify user role or suspend/activate account.

---

## 📁 Directory Structure

```text
backend/
├── app/
│   ├── core/
│   │   ├── config.py             # Pydantic v2 settings, JWT & SQLite config
│   │   ├── auth_crypto.py        # PBKDF2 password hashing & HMAC-SHA256 JWT
│   │   ├── dependencies.py       # JWT Bearer auth & RBAC dependencies
│   │   ├── logger.py             # Privacy-compliant structured JSON logger
│   │   └── security.py           # MIME, magic bytes, & size validators
│   ├── models/
│   │   ├── detection_model.py    # YOLOv8/YOLO11 wrapper (.pt, .onnx, .tflite)
│   │   └── user_db.py            # SQLite user repository & test account seed
│   ├── schemas/
│   │   ├── common.py             # Health check & error response models
│   │   ├── detection.py          # BoundingBox, Lesion, DetectResponse
│   │   ├── classification.py     # Classifier handoff & AnalyzeResponse
│   │   └── user.py               # User login, register, profile & stats schemas
│   ├── services/
│   │   ├── auth_service.py       # User auth, registration & profile service
│   │   ├── detection_service.py  # Thread-safe async detection service (<100ms)
│   │   ├── classifier_client.py  # Outbound httpx client to external classifier
│   │   └── stream_service.py     # Real-time frame & WebSocket streaming service
│   ├── routers/
│   │   ├── api.py                # Aggregator router (/api/v1)
│   │   ├── auth.py               # POST /auth/register, /auth/login, /auth/logout
│   │   ├── users.py              # GET/PATCH /me, GET /me/stats, /admin/users
│   │   ├── detection.py          # POST /detect/image & POST /detect
│   │   ├── classification.py     # POST /capture/classify & POST /analyze
│   │   ├── stream.py             # POST /detect/frame & WS /ws/detect
│   │   └── health.py             # GET /health
│   ├── utils/
│   │   ├── grading.py            # Hayashi clinical acne severity grading
│   │   └── image_ops.py          # In-memory PIL/NumPy decoding (no disk I/O)
│   └── main.py                   # FastAPI app, lifespan, CORS, middleware
├── tests/
│   ├── test_auth.py              # Test accounts, JWT auth & RBAC tests
│   ├── test_detection.py         # Detection and MIME validation tests
│   └── test_classification.py    # Classifier handoff tests
├── weights/
│   └── README.md                 # Model weights placement guide
├── .env.example                  # Environment configuration template
├── Dockerfile                    # Production multi-stage Docker build
├── docker-compose.yml            # Containerized deployment orchestration
└── requirements.txt              # Production Python dependencies
```

---

## 🛠️ Quickstart & Local Setup

### 1. Prerequisites
- Python 3.10+ (Python 3.11 recommended)
- `pip` or `conda`

### 2. Create Virtual Environment & Install Dependencies
```bash
cd backend
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1

# Linux / macOS
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
```

### 4. Run the Development Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Interactive Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 🔗 Connecting with the Existing Mobile Frontend

In `d:\git\acnevision-mobile`:

1. Copy `.env.example` to `.env` (if not already done):
   ```bash
   cp .env.example .env
   ```
2. Set `VITE_USE_MOCK=false` to route real traffic to the FastAPI backend:
   ```env
   VITE_USE_MOCK=false
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```
The frontend camera scan, static upload, bounding boxes overlay, acne count chips, and result page will now be powered live by the FastAPI backend!

