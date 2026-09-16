# HMAC-SHA256 Authentication Backend

High-performance Python authentication backend built with **FastAPI** implementing a cryptographic **HMAC-SHA256 Challenge-Response Protocol**.

---

## Features

- **Zero-Knowledge Password Transmission**: Credentials are never transmitted over the wire. Authentication is proven mathematically via shared secret signatures.
- **Dynamic 128-Bit Nonce Challenges**: Generated using Python's cryptographically secure pseudo-random number generator (`secrets.token_hex(16)`).
- **Replay Attack Resistance**: Challenges are stored with a 120-second TTL in a single-use store (`CHALLENGE_STORE.pop(...)`), ensuring intercepted tokens cannot be reused.
- **Timing Side-Channel Immunity**: Constant-time comparison using `hmac.compare_digest()` prevents timing attacks against the digest equality check.
- **CORS Configured**: Fully integrated with the React frontend on `localhost:5173`.

---

## Test Users in Mock Database

| Username | Shared Secret Key | Role |
| :--- | :--- | :--- |
| `alice` | `MySecretKey123` | Authorized User |
| `bob` | `NetworkSecurity456` | Authorized User |

---

## API Endpoints

### 1. Request Challenge
- **Endpoint**: `POST /api/auth/challenge`
- **Request Body**:
  ```json
  {
    "username": "alice"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "challenge_id": "XFLMnNrMQpR7cxgKQ5bEwg",
      "challenge": "3576921688af288a9b6886d637881532"
    }
    ```
  - `404 Not Found`:
    ```json
    {
      "detail": "User not found"
    }
    ```

### 2. Verify Authentication Response
- **Endpoint**: `POST /api/auth/verify`
- **Request Body**:
  ```json
  {
    "challenge_id": "XFLMnNrMQpR7cxgKQ5bEwg",
    "response": "fe251997ef2a35026e5102d7c36bda2f8b280e1d29d7ae9980984d93257e9e25"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "status": "success",
      "message": "Authenticated successfully as 'alice'"
    }
    ```
  - `401 Unauthorized` (Incorrect Secret):
    ```json
    {
      "detail": "HMAC verification failed. Incorrect secret key."
    }
    ```
  - `401 Unauthorized` (Replay or Expired Session):
    ```json
    {
      "detail": "Challenge invalid, expired, or already consumed (Replay Protection Active)"
    }
    ```

---

## Setup and Installation

### Prerequisites
- Python 3.10 or higher
- `pip` (Python package manager)

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create and Activate Virtual Environment
- **Windows (PowerShell)**:
  ```powershell
  python -m venv venv
  .\venv\Scripts\Activate.ps1
  ```
- **Windows (Command Prompt)**:
  ```cmd
  python -m venv venv
  venv\Scripts\activate.bat
  ```
- **macOS / Linux**:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## Running the Server

Start the Uvicorn development server:
```bash
uvicorn main:app --reload --port 8000
```

The backend server will start at:
- API Base: `http://localhost:8000`
- Interactive Swagger API Docs: `http://localhost:8000/docs`
- ReDoc Documentation: `http://localhost:8000/redoc`

---

## Testing Endpoints via Terminal

### Windows PowerShell Example
```powershell
# 1. Request Challenge
$body = '{"username":"alice"}'
$res = Invoke-RestMethod -Uri 'http://localhost:8000/api/auth/challenge' -Method Post -ContentType 'application/json' -Body $body

# 2. Compute HMAC in Python
$hmac = python -c "import hmac, hashlib; print(hmac.new(b'MySecretKey123', b'$($res.challenge)', hashlib.sha256).hexdigest())"

# 3. Verify Response
$verifyBody = "{""challenge_id"":""$($res.challenge_id)"",""response"":""$hmac""}"
Invoke-RestMethod -Uri 'http://localhost:8000/api/auth/verify' -Method Post -ContentType 'application/json' -Body $verifyBody
```
