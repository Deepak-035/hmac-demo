from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import hmac
import hashlib
import secrets
import time

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Test users database
USER_DB = {
    "alice": "MySecretKey123",
    "bob": "NetworkSecurity456"
}

# Temporary challenge store: { challenge_id: { username, challenge, expires } }
CHALLENGE_STORE = {}

class InitAuthRequest(BaseModel):
    username: str

class VerifyAuthRequest(BaseModel):
    challenge_id: str
    response: str

@app.post("/api/auth/challenge")
def request_challenge(payload: InitAuthRequest):
    # Test Case 3: Unknown Username
    if payload.username not in USER_DB:
        raise HTTPException(status_code=404, detail="User not found")
    
    challenge = secrets.token_hex(16)
    challenge_id = secrets.token_urlsafe(16)
    
    CHALLENGE_STORE[challenge_id] = {
        "username": payload.username,
        "challenge": challenge,
        "expires": time.time() + 120
    }
    
    return {"challenge_id": challenge_id, "challenge": challenge}

@app.post("/api/auth/verify")
def verify_response(payload: VerifyAuthRequest):
    # Single-use enforcement (protects against replay attacks)
    session = CHALLENGE_STORE.pop(payload.challenge_id, None) 
    
    if not session or time.time() > session["expires"]:
        raise HTTPException(
            status_code=401, 
            detail="Challenge invalid, expired, or already consumed (Replay Protection Active)"
        )

    user_secret = USER_DB[session["username"]]
    
    # Calculate expected HMAC SHA-256
    expected_hmac = hmac.new(
        user_secret.encode(),
        session["challenge"].encode(),
        hashlib.sha256
    ).hexdigest()

    # Timing-safe comparison to prevent timing side-channel attacks[cite: 2]
    if hmac.compare_digest(expected_hmac, payload.response):
        return {"status": "success", "message": f"Authenticated successfully as '{session['username']}'"}
    
    # Test Case 2: Incorrect Secret[cite: 1, 2]
    raise HTTPException(status_code=401, detail="HMAC verification failed. Incorrect secret key.")