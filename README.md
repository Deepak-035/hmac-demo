# 🔐 HMAC-SHA256 Challenge-Response Authentication Protocol
### Cryptography & Network Security Laboratory Project • Course Code: `BCS703`

<div align="center">

![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/Frontend-React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Language-Python_3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Crypto](https://img.shields.io/badge/Standard-RFC_2104_HMAC-00f0ff?style=for-the-badge&logo=shield&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<p align="center">
  <b>A zero-knowledge, timing-safe mutual authentication engine built to demonstrate cryptographic proof of identity without ever transmitting passwords across untrusted networks.</b>
</p>

[Key Features](#-key-features) •
[Interactive Protocol Flow](#-interactive-protocol-flow) •
[Security Principles](#-core-cryptographic-principles) •
[Quick Start](#-quick-start-guide) •
[Test Scenarios](#-protocol-test-suites--attack-vectors) •
[Project Team](#-project-team--contributors)

</div>

---

## 👥 Project Team & Contributors

This project is developed as an academic assignment for **Cryptography (Subject Code: BCS703)**.

<div align="center">
<table>
  <tr>
    <td align="center" width="50%">
      <a href="https://github.com/Deepak-035">
        <img src="https://github.com/Deepak-035.png?size=100" width="100px;" alt="Deepak" style="border-radius:50%;"/><br />
        <sub><b>Deepak</b></sub>
      </a>
      <br />
      <code>Lead Developer & Architecture</code>
      <br />
      <a href="https://github.com/Deepak-035">@Deepak-035</a>
    </td>
    <td align="center" width="50%">
      <a href="https://github.com/Vijeth737">
        <img src="https://github.com/Vijeth737.png?size=100" width="100px;" alt="K Vijeth V naik" style="border-radius:50%;"/><br />
        <sub><b>K Vijeth V naik</b></sub>
      </a>
      <br />
      <code>Cryptography & Security Research</code>
      <br />
      <a href="https://github.com/Vijeth737">@Vijeth737</a>
    </td>
  </tr>
</table>
</div>

---

## ⚡ Key Features

- 🛡️ **Zero-Knowledge Password Exchange**: Shared keys $K$ remain strictly on the client and server—never traversing the wire.
- 🎲 **128-Bit Dynamic Nonces (CSPRNG)**: Cryptographically secure random challenges generated per session via Python `secrets`.
- ⏱️ **Timing-Safe Digest Verification**: Constant-time comparison using `hmac.compare_digest()` to eliminate timing side-channel exploits.
- 🚫 **Active Replay Attack Shield**: Challenge nonces enforce single-use consumption (`CHALLENGE_STORE.pop()`) with strict TTL expiration.
- 🧪 **Interactive Cyber Cyber-Lab Interface**: Live 9-step visualization pipeline, animated in-flight packet visualizer, and simulated adversary eavesdropping.
- ⚡ **WebCrypto API Native**: High-performance browser-side hashing using hardware-accelerated SubtleCrypto primitives (`HMAC-SHA-256`).

---

## 🔄 Interactive Protocol Flow

```
   ┌────────────────────────────────┐                     ┌────────────────────────────────┐
   │         CLIENT BROWSER         │                     │     AUTHENTICATION SERVER      │
   │      (React + WebCrypto)       │                     │       (FastAPI + Secrets)      │
   └───────────────┬────────────────┘                     └───────────────┬────────────────┘
                   │                                                      │
                   │ ─── 1. POST /api/auth/challenge { username } ──────> │
                   │                                                      │ ── 2. Verify User in Database
                   │                                                      │ ── 3. Generate 128-bit CSPRNG Nonce (C)
                   │ <── 4. 200 OK { challenge_id, challenge (C) } ───── │       with 120s Expiry TTL
                   │                                                      │
   ── 5. Compute HMAC locally:                                            │
         R = HMAC-SHA256(Key, C)                                          │
                   │                                                      │
                   │ ─── 6. POST /api/auth/verify { challenge_id, R } ──> │
                   │                                                      │ ── 7. Calculate Expected HMAC:
                   │                                                      │       R_exp = HMAC-SHA256(Key_db, C)
                   │                                                      │ ── 8. Constant-Time Comparison:
                   │                                                      │       hmac.compare_digest(R_exp, R)
                   │ <── 9. 200 OK Authenticated / 401 Unauthorized ──── │ ── 9. Single-Use Token Consumed
                   │                                                      │
```

---

## 🔬 Core Cryptographic Principles

### 1. Proof of Secret Knowledge without Revelation
Standard authentication sends passwords (even hashed) across the network, leaving them vulnerable to interception or proxy compromise. In this challenge-response scheme, the client demonstrates possession of secret $K$ by signing server-issued challenge nonce $C$:

$$\large R = \text{HMAC-SHA256}(K, C)$$

An eavesdropper sniffing network traffic only observes random token $C$ and digest $R$. Because HMAC is mathematically irreversible (one-way property of SHA-256), the adversary cannot derive secret $K$.

### 2. Immunity to Replay Attacks
If an attacker eavesdrops on and captures payload $(C, R)$, they cannot reuse $R$ to authenticate later:
1. Every new session demands a brand-new random challenge $C'$ ($2^{128}$ entropy space).
2. The server consumes and deletes the challenge ID immediately upon first receipt (`pop()`).
3. Expired sessions (> 120 seconds) are invalidated automatically.

### 3. Protection Against Timing Side-Channel Leaks
Standard naive string comparisons (`if expected == received:`) terminate at the first non-matching byte, allowing attackers to measure CPU clock cycles to deduce signatures character-by-character. 
This system utilizes Python's:
```python
hmac.compare_digest(expected_hmac, payload.response)
```
This guarantees constant-time evaluation, completely neutralizing timing attacks.

---

## 🧪 Protocol Test Suites & Attack Vectors

The application includes interactive laboratory test buttons to observe system behavior under both authorized and hostile conditions:

| Scenario | Inputs / Action | Cryptographic Reaction | Result |
| :--- | :--- | :--- | :---: |
| **Case 1: Valid Auth** | `alice` / `MySecretKey123` | Digests match identically via constant-time verification | <span style="color:#10b981">**200 OK (Authenticated)**</span> |
| **Case 2: Wrong Secret** | `alice` / `WrongSecret123` | Client computes divergent signature $R \neq R_{\text{exp}}$ | <span style="color:#ef4444">**401 Unauthorized**</span> |
| **Case 3: Unknown User** | `charlie` / `SomeSecret123` | Server queries `USER_DB` and halts prior to issuing nonces | <span style="color:#f59e0b">**404 Not Found**</span> |
| **Case 4: Fresh Nonces** | Sequential handshakes | Two consecutive sessions generate distinct 128-bit nonces | <span style="color:#3b82f6">**Dynamic Entropy Confirmed**</span> |
| **Case 5a: Capture Payload** | Sniffer intercepts traffic | Eavesdropper captures valid signature $R$ in memory buffer | <span style="color:#a855f7">**Payload Intercepted**</span> |
| **Case 5b: Replay Attack** | Inject sniffed $R$ into new challenge | Server detects challenge mismatch; single-use token consumed | <span style="color:#ef4444">**401 Replay Blocked**</span> |
| **Custom Handshake** | Custom inputs & live inputs | Instant real-time handshake execution | <span style="color:#00f0ff">**Live Execution**</span> |

---

## 📂 Repository Structure

```
hmac-demo/
├── backend/                       # Python FastAPI Cryptographic Backend
│   ├── main.py                    # API Endpoints, USER_DB, & Constant-time logic
│   ├── requirements.txt           # Backend dependencies
│   └── README.md                  # Backend technical documentation
├── frontend/                      # React 19 + TypeScript Cyber Laboratory UI
│   ├── src/
│   │   ├── assets/
│   │   │   └── bgvdo.mp4          # Cyber laboratory background animation
│   │   ├── App.tsx                # Interactive state machine & 9-step timeline
│   │   ├── hmacUtils.ts           # Native WebCrypto HMAC-SHA256 implementation
│   │   ├── index.css              # Glassmorphic CSS design system
│   │   └── main.tsx               # Client entry point
│   ├── index.html                 # App wrapper & Google Fonts configuration
│   ├── package.json               # Frontend dependencies
│   └── tsconfig.app.json          # TypeScript compilation settings
└── README.md                      # Comprehensive project documentation
```

---

## 🚀 Quick Start Guide

Run the full stack locally using two terminals.

### 🖥️ Terminal 1: Backend Setup (FastAPI)

```bash
# 1. Enter backend directory
cd backend

# 2. Create virtual environment
# Windows (PowerShell):
python -m venv venv
.\venv\Scripts\Activate.ps1

# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Launch backend API server
uvicorn main:app --reload --port 8000
```
> 🌐 **Backend API:** `http://localhost:8000`  
> 📖 **Interactive Swagger Docs:** `http://localhost:8000/docs`

---

### 💻 Terminal 2: Frontend Setup (React + Vite)

```bash
# 1. Enter frontend directory
cd frontend

# 2. Install NPM packages
npm install

# 3. Start development server
npm run dev
```
> 🌐 **Cyber Laboratory UI:** `http://localhost:5173/`

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite 8, Web Crypto API (`window.crypto.subtle`) |
| **Styling** | Cyberpunk Glassmorphism, CSS Custom Properties, Keyframe Animations |
| **Backend** | Python 3.10+, FastAPI, Uvicorn (ASGI), Pydantic v2 |
| **Cryptography** | RFC 2104 HMAC, SHA-256, CSPRNG Nonces (`secrets`), `hmac.compare_digest()` |
| **Fonts** | Space Grotesk, Inter, JetBrains Mono |

---

## 📜 Academic Integrity & License

This project was built for academic evaluation under **Cryptography (BCS703)**.  
Released under the [MIT License](LICENSE).
