# HMAC-SHA256 Protocol Laboratory Frontend

Cinematic, dark cybersecurity dashboard and interactive visualizer for the **HMAC-SHA256 Challenge-Response Authentication Protocol**, built with **React 19**, **TypeScript**, and **Vite**.

---

## Visual & Technical Highlights

- **Cinematic Video Background**: Integrated looping video (`src/assets/bgvdo.mp4`) with a custom radial vignette overlay for optimal text readability.
- **Blur-to-Sharp Text Reveal**: The hero title uses a 1.5-second CSS `blurReveal` animation (`filter: blur(24px)` to `blur(0px)`).
- **High-Intensity Neon Button**: Custom `.shadow__btn` with an electric blue neon glow and smooth hover transitions.
- **Vertical Down Approach Protocol Timeline**: Steps 1 through 9 are arranged in a descending chronological pipeline with illuminated node badges (`01` - `09`) and a dynamic connecting timeline rail.
- **Dynamic Step-Tracking Auto-Scroll**:
  - Clicking **Run Handshake** or any test case smoothly scrolls to the execution protocol.
  - As each step executes and completes, the screen automatically scrolls downwards to keep the active card centered in the viewport.
- **Client-Side Cryptography**: Uses the browser's native **WebCrypto SubtleCrypto API** (`crypto.subtle.importKey` and `crypto.subtle.sign`) for zero-dependency, hardware-accelerated HMAC-SHA256 calculations.
- **Cryptographic Inspector**: Live inspection of session tokens, 128-bit hex challenges, and 256-bit output signatures with one-click copy buttons.
- **Real-Time Security Console**: Terminal logging of handshake packets, verification verdicts, and attack defenses.

---

## Project Structure

```
frontend/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   │   └── bgvdo.mp4          # Cyber background video
│   ├── App.tsx                # Main laboratory dashboard & state machine
│   ├── hmacUtils.ts           # WebCrypto HMAC-SHA256 calculation utility
│   ├── index.css              # Cyber design system, glassmorphism, & keyframes
│   ├── main.tsx               # React application entry point
│   └── vite-env.d.ts          # Vite client and media module type definitions
├── index.html                 # HTML shell with Google Fonts
├── package.json               # Scripts and dependencies
├── tsconfig.app.json          # TypeScript compiler options
└── vite.config.ts             # Vite configuration
```

---

## Setup and Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

---

## Running the Application

### Start Development Server
```bash
npm run dev
```

The application will be accessible at:
- **Local URL**: `http://localhost:5173/`

### Type Check
To run the TypeScript compiler check:
```bash
npm run build
```
*(Runs `tsc -b && vite build`)*

### Build for Production
To generate the optimized production bundle:
```bash
npm run build
```
The compiled assets will be output to `frontend/dist/`.

### Preview Production Build
To preview the production bundle locally:
```bash
npm run preview
```

---

## Interactive Protocol Test Suites

The frontend includes 6 automated scenarios that communicate directly with the live FastAPI backend:

1. **Case 1: Valid Auth**: Valid username (`alice`) & correct secret (`MySecretKey123`) $\to$ **Success**.
2. **Case 2: Wrong Secret**: Valid username (`alice`) with invalid secret (`WrongSecret123`) $\to$ **Expected 401 Failure**.
3. **Case 3: Unknown User**: Non-existent username (`charlie`) $\to$ **Expected 404 Failure**.
4. **Case 4: Dynamic Challenge**: Runs two sequential handshakes to verify challenge freshness and high entropy across sessions.
5. **Case 5a: Capture Payload**: Simulates an eavesdropper intercepting the signed response token.
6. **Case 5b: Replay Attack**: Injects the sniffed response token into a new session $\to$ **Blocked by single-use token protection**.
7. **Custom Handshake**: Test any username and password with a live secret mask toggle (`👁️` / `🔒`).
