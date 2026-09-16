# HMAC-SHA256 Challenge-Response Authentication System

A cryptographic challenge-response authentication platform designed with a modern cybersecurity laboratory interface. This project demonstrates how mutual authentication and zero-knowledge proof of credentials can be achieved across an untrusted network using **HMAC (Hash-based Message Authentication Code) with SHA-256**.

---

## Architecture Overview

```
[ CLIENT BROWSER (React + WebCrypto) ]               [ AUTHENTICATION SERVER (FastAPI) ]
                │                                                     │
                │ ─── 1. POST /api/auth/challenge { username } ────> │
                │                                                     │ 2. Verify User in Database
                │                                                     │ 3. Generate 128-bit Nonce (C)
                │ <── 4. 200 OK { challenge_id, challenge (C) } ──── │    & Store with 120s TTL
                │                                                     │
 5. Calculate Local HMAC:                                             │
    R = HMAC-SHA256(K, C)                                             │
                │                                                     │
                │ ─── 6. POST /api/auth/verify { challenge_id, R } ─> │
                │                                                     │ 7. Compute Expected HMAC:
                │                                                     │    R_exp = HMAC-SHA256(K_db, C)
                │                                                     │ 8. Constant-Time Comparison:
                │                                                     │    compare_digest(R_exp, R)
                │ <── 9. 200 OK / 401 Unauthorized ────────────────── │ 9. Single-Use Token Consumed
```

---

## Core Cryptographic Principles

### 1. Zero-Knowledge Password Transmission
The shared secret key $K$ is **never sent across the network** during authentication. Instead, the client proves possession of the secret by calculating a cryptographic signature over an unpredictable random challenge $C$:

$$\large R = \text{HMAC-SHA256}(K, C)$$

Where:
- $K$ = Shared Secret Key
- $C$ = Random Challenge Nonce (128-bit hex string)
- $R$ = Authentication Response Signature (256-bit hex digest)

### 2. Dynamic Challenge Freshness (Anti-Replay)
Every session generates a new pseudorandom nonce using CSPRNG (`secrets.token_hex(16)`). An eavesdropper capturing the response $R$ cannot reuse it because the backend enforces **single-use consumption** (`CHALLENGE_STORE.pop(challenge_id)`) with an expiration window.

### 3. Timing Side-Channel Attack Immunity
Normal string equality comparisons (`==`) terminate on the first mismatched byte, creating timing leaks that allow attackers to deduce signatures byte-by-byte. The backend uses Python's **`hmac.compare_digest()`**, ensuring comparisons run in constant time regardless of where mismatches occur.

---

## Repository Structure

```
hmac-demo/
├── backend/                  # FastAPI Python backend
│   ├── main.py               # API endpoints, challenge store & verify logic
│   ├── requirements.txt      # Python dependencies (FastAPI, Uvicorn)
│   └── README.md             # Backend setup & API reference
├── frontend/                 # React 19 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── assets/
│   │   │   └── bgvdo.mp4     # Cyber video background
│   │   ├── App.tsx           # Dashboard, state machine & 9-step timeline
│   │   ├── hmacUtils.ts      # WebCrypto SubtleCrypto HMAC calculation
│   │   ├── index.css         # Glassmorphism design system & animations
│   │   ├── main.tsx          # React application root
│   │   └── vite-env.d.ts     # Type declarations
│   ├── index.html            # Entry HTML with custom Google Fonts
│   ├── package.json          # Node scripts & dependencies
│   ├── tsconfig.app.json     # TypeScript configuration
│   └── README.md             # Frontend setup & UI documentation
└── README.md                 # Project root documentation (this file)
```

---

## Quick Start Guide

To run the full stack locally, open two separate terminal windows.

### Terminal 1: Backend (FastAPI)

```bash
# 1. Navigate to the backend folder
cd backend

# 2. Create and activate a Python virtual environment
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the backend server
uvicorn main:app --reload --port 8000
```
> The API will be active at `http://localhost:8000` (API documentation at `http://localhost:8000/docs`).

---

### Terminal 2: Frontend (React + Vite)

```bash
# 1. Navigate to the frontend folder
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```
> Open your browser and navigate to `http://localhost:5173/`.

---

## Interactive Cyber Test Scenarios

The frontend dashboard provides one-click test suites and attack vectors:

| Test Case | Scenario | Expected Outcome |
| :--- | :--- | :--- |
| **Case 1: Valid Auth** | `alice` with `MySecretKey123` | **200 OK**: Authenticated successfully |
| **Case 2: Wrong Secret** | `alice` with `WrongSecret123` | **401 Unauthorized**: HMAC verification failed |
| **Case 3: Unknown User** | `charlie` with `SomeSecret123` | **404 Not Found**: User not found in database |
| **Case 4: Dynamic Nonces** | Sequential handshakes | **Success**: Verified unique challenge entropy |
| **Case 5a: Capture Payload** | Eavesdropper sniffing | Intercepts signature $R$ into attacker buffer |
| **Case 5b: Replay Attack** | Injects sniffed $R$ into new challenge | **401 Blocked**: Replay protection active |
| **Custom Handshake** | Custom username & secret inputs | Dynamic real-time verification |

---

## Technology Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite 8
- **Language**: TypeScript
- **Cryptography**: Web Crypto API (`window.crypto.subtle`)
- **Styling**: Vanilla CSS (Glassmorphism, CSS Custom Properties, Keyframe Animations)
- **Typography**: Space Grotesk, Inter, JetBrains Mono

### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn (ASGI)
- **Language**: Python 3.10+
- **Validation**: Pydantic v2
- **Cryptography**: Python standard library (`hmac`, `hashlib`, `secrets`)

---

## License
MIT License. Built for educational and cybersecurity demonstration purposes.
