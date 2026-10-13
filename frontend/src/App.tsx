import { useState, useRef, useEffect } from "react";
import { calculateHMAC } from "./hmacUtils";
import bgVideo from "./assets/bgvdo.mp4";

const API_BASE = "http://localhost:8000/api/auth";

interface LogEntry {
  title: string;
  detail: string;
  status: "info" | "success" | "error" | "warn";
  timestamp: string;
}

type StepStatus = "idle" | "running" | "done" | "error";

interface StepState {
  status: StepStatus;
  detail?: string;
  subData?: Record<string, string>;
}

export default function App() {
  // Logs & Captured Payload
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [capturedPayload, setCapturedPayload] = useState<{ challenge_id: string; response: string; challenge?: string } | null>(null);

  // Custom Input Credentials
  const [inputUsername, setInputUsername] = useState("alice");
  const [inputSecret, setInputSecret] = useState("MySecretKey123");
  const [showSecret, setShowSecret] = useState(false);

  // Execution Speed Delay (ms)
  const [stepDelay, setStepDelay] = useState<number>(750);

  // Live Protocol State
  const [isRunning, setIsRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [packetDirection, setPacketDirection] = useState<"idle" | "to-server" | "to-client">("idle");
  const [packetLabel, setPacketLabel] = useState<string>("");

  // Step Data & State (1 - 9)
  const [steps, setSteps] = useState<{ [key: number]: StepState }>({
    1: { status: "idle" },
    2: { status: "idle" },
    3: { status: "idle" },
    4: { status: "idle" },
    5: { status: "idle" },
    6: { status: "idle" },
    7: { status: "idle" },
    8: { status: "idle" },
    9: { status: "idle" },
  });

  // Current session crypto artifacts for inspector
  const [sessionArtifacts, setSessionArtifacts] = useState<{
    username?: string;
    challenge_id?: string;
    challenge?: string;
    hmac_response?: string;
    server_result?: string;
  }>({});

  const labRef = useRef<HTMLDivElement>(null);
  const stepsSectionRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [consoleOpen, setConsoleOpen] = useState(true);

  // Auto-scroll log container to bottom on new entries
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const log = (title: string, detail: string, status: LogEntry["status"] = "info") => {
    const timeStr = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { title, detail, status, timestamp: timeStr }]);
  };

  const clearLogs = () => setLogs([]);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Dynamic smooth scroll helper to track steps down the page
  const scrollToActiveStep = (stepNum: number) => {
    setTimeout(() => {
      const el = document.getElementById(`step-row-${stepNum}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 50);
  };

  const resetStepStates = () => {
    setSteps({
      1: { status: "idle" },
      2: { status: "idle" },
      3: { status: "idle" },
      4: { status: "idle" },
      5: { status: "idle" },
      6: { status: "idle" },
      7: { status: "idle" },
      8: { status: "idle" },
      9: { status: "idle" },
    });
    setActiveStep(0);
    setPacketDirection("idle");
    setPacketLabel("");
    setSessionArtifacts({});
  };

  const updateStep = (stepNum: number, status: StepStatus, detail?: string, subData?: Record<string, string>) => {
    setSteps((prev) => ({
      ...prev,
      [stepNum]: { status, detail, subData },
    }));
  };

  // Scroll down to the Execution Protocol Steps section
  const scrollToStepsSection = () => {
    setTimeout(() => {
      stepsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // Generic Execution Helper with visual pacing, step down animations & dynamic scrolling
  const runAuthProtocol = async (
    username: string,
    secret: string,
    overrideHmac?: string,
    overrideChallengeId?: string,
    isReplayTest: boolean = false
  ) => {
    setIsRunning(true);
    resetStepStates();
    setSessionArtifacts((prev) => ({ ...prev, username }));

    // Automatically scroll down to the Execution Protocol Steps
    scrollToStepsSection();

    try {
      // STEP 1: Authentication Request
      setActiveStep(1);
      scrollToActiveStep(1);
      updateStep(1, "running", `Preparing authentication handshake for '${username}'...`);
      setPacketDirection("to-server");
      setPacketLabel(`POST /api/auth/challenge (user: "${username}")`);
      log("Step 1", `Client initiating handshake with username: '${username}'`, "info");
      await delay(stepDelay);
      updateStep(1, "done", `Authentication request dispatched for '${username}'`);

      // STEP 2: Username Verification (Server side)
      setActiveStep(2);
      scrollToActiveStep(2);
      updateStep(2, "running", `Server querying database for username: '${username}'...`);
      setPacketDirection("idle");
      await delay(stepDelay * 0.85);

      let data1: { challenge_id: string; challenge: string };
      try {
        const res1 = await fetch(`${API_BASE}/challenge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        const json1 = await res1.json();
        if (!res1.ok) {
          throw new Error(`[${res1.status}] ${json1.detail || "User not found"}`);
        }
        data1 = json1;
      } catch (err: any) {
        updateStep(2, "error", `Verification failed: ${err.message}`);
        updateStep(9, "error", `Authentication Failed: ${err.message}`);
        scrollToActiveStep(9);
        log("Step 2 Failed", `Server rejected username '${username}': ${err.message}`, "error");
        setPacketDirection("idle");
        setIsRunning(false);
        throw err;
      }

      updateStep(2, "done", `User '${username}' verified in server records`);
      log("Step 2", `User '${username}' exists in USER_DB`, "success");

      // STEP 3: Generate Random Challenge
      setActiveStep(3);
      scrollToActiveStep(3);
      updateStep(3, "running", "Generating cryptographic 128-bit random nonce challenge...");
      await delay(stepDelay * 0.9);
      updateStep(3, "done", `Challenge: ${data1.challenge}`, {
        challenge_id: data1.challenge_id,
        challenge: data1.challenge,
      });
      setSessionArtifacts((prev) => ({
        ...prev,
        challenge_id: data1.challenge_id,
        challenge: data1.challenge,
      }));
      log("Step 3", `Server generated challenge: ${data1.challenge}`, "info");

      // STEP 4: Send Challenge
      setActiveStep(4);
      scrollToActiveStep(4);
      updateStep(4, "running", "Transmitting random challenge token back to client...");
      setPacketDirection("to-client");
      setPacketLabel(`200 OK: nonce "${data1.challenge.slice(0, 10)}..."`);
      await delay(stepDelay);
      updateStep(4, "done", `Challenge token received by browser client`);
      log("Step 4", `Client safely received dynamic challenge`, "info");

      // STEP 5: HMAC-SHA256 Calculation
      setActiveStep(5);
      scrollToActiveStep(5);
      updateStep(5, "running", "Computing local HMAC-SHA-256(Key, Challenge) via WebCrypto API...");
      setPacketDirection("idle");
      await delay(stepDelay * 1.1);

      const calculatedHmac = await calculateHMAC(secret, data1.challenge);
      const effectiveHmac = overrideHmac || calculatedHmac;

      updateStep(5, "done", `R = ${effectiveHmac.slice(0, 16)}...`, {
        formula: "R = HMAC-SHA256(K, C)",
        computed: effectiveHmac,
      });
      setSessionArtifacts((prev) => ({
        ...prev,
        hmac_response: effectiveHmac,
      }));
      log("Step 5", `Computed HMAC Response: ${effectiveHmac}`, "info");

      // STEP 6: Client Sends Response
      setActiveStep(6);
      scrollToActiveStep(6);
      updateStep(6, "running", "Dispatching HMAC signature response to server...");
      setPacketDirection("to-server");
      setPacketLabel(
        isReplayTest
          ? `[REPLAY ATTACK] POST /api/auth/verify (token: ${effectiveHmac.slice(0, 8)}...)`
          : `POST /api/auth/verify (token: ${effectiveHmac.slice(0, 8)}...)`
      );
      await delay(stepDelay);
      updateStep(6, "done", "Payload delivered to server verification pipeline");
      log("Step 6", `Sent HMAC response to server for verification`, "info");

      // STEP 7: Server Calculates Expected Response
      setActiveStep(7);
      scrollToActiveStep(7);
      updateStep(7, "running", "Server retrieving stored secret key and computing expected HMAC...");
      setPacketDirection("idle");
      await delay(stepDelay * 0.9);
      updateStep(7, "done", "Expected HMAC calculated using server secret key");
      log("Step 7", "Server computed internal benchmark HMAC", "info");

      // STEP 8: Secure Comparison (Timing-Safe compare_digest)
      setActiveStep(8);
      scrollToActiveStep(8);
      updateStep(8, "running", "Executing constant-time compare_digest() verification...");
      await delay(stepDelay * 0.9);

      const targetChallengeId = overrideChallengeId || data1.challenge_id;

      const res2 = await fetch(`${API_BASE}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: targetChallengeId,
          response: effectiveHmac,
        }),
      });

      const data2 = await res2.json();

      if (!res2.ok) {
        updateStep(8, "error", `Digest mismatch or invalid session: ${data2.detail}`);
        updateStep(9, "error", `AUTHENTICATION FAILED: ${data2.detail}`);
        scrollToActiveStep(9);
        setSessionArtifacts((prev) => ({ ...prev, server_result: `Failed: ${data2.detail}` }));
        log("Step 8 / 9", `HMAC Verification Failed: ${data2.detail}`, "error");
        setIsRunning(false);
        throw new Error(data2.detail || "Authentication Failed");
      }

      updateStep(8, "done", "Timing-safe digest match confirmed (0 side-channel leaks)");
      log("Step 8", "Digest match verified via hmac.compare_digest()", "success");

      // STEP 9: Authentication Result
      setActiveStep(9);
      scrollToActiveStep(9);
      updateStep(9, "done", `SUCCESS: ${data2.message}`);
      setSessionArtifacts((prev) => ({ ...prev, server_result: data2.message }));
      log("Step 9", `AUTHENTICATION SUCCESSFUL: ${data2.message}`, "success");

      return {
        challenge_id: data1.challenge_id,
        challenge: data1.challenge,
        response: effectiveHmac,
        message: data2.message,
      };
    } finally {
      setIsRunning(false);
      setPacketDirection("idle");
    }
  };

  // Test Case 1: Valid Auth
  const testCase1 = async () => {
    clearLogs();
    log("TEST CASE 1", "Valid Username ('alice') & Correct Secret ('MySecretKey123')", "info");
    try {
      await runAuthProtocol("alice", "MySecretKey123");
    } catch (err: any) {
      log("RESULT", `FAILED: ${err.message}`, "error");
    }
  };

  // Test Case 2: Wrong Secret
  const testCase2 = async () => {
    clearLogs();
    log("TEST CASE 2", "Valid Username ('alice') but Incorrect Secret ('WrongSecret123')", "warn");
    try {
      await runAuthProtocol("alice", "WrongSecret123");
      log("RESULT", "UNEXPECTED SUCCESS", "error");
    } catch (err: any) {
      log("RESULT", `EXPECTED FAILURE: ${err.message}`, "success");
    }
  };

  // Test Case 3: Unknown Username
  const testCase3 = async () => {
    clearLogs();
    log("TEST CASE 3", "Unknown Username ('charlie')", "warn");
    try {
      await runAuthProtocol("charlie", "SomeSecret123");
      log("RESULT", "UNEXPECTED SUCCESS", "error");
    } catch (err: any) {
      log("RESULT", `EXPECTED FAILURE: ${err.message}`, "success");
    }
  };

  // Test Case 4: Sequential Dynamic Challenges
  const testCase4 = async () => {
    clearLogs();
    log("TEST CASE 4", "Sequential Authentications (Verify Challenge Freshness / Dynamic Entropy)", "info");
    try {
      log("SEQUENCE", "Executing Session 1...", "info");
      const run1 = await runAuthProtocol("alice", "MySecretKey123");
      log("SESSION 1 COMPLETE", `Challenge 1: ${run1.challenge}`, "success");

      await delay(1200);

      log("SEQUENCE", "Executing Session 2...", "info");
      const run2 = await runAuthProtocol("alice", "MySecretKey123");
      log("SESSION 2 COMPLETE", `Challenge 2: ${run2.challenge}`, "success");

      if (run1.challenge !== run2.challenge) {
        log("VERIFICATION PASS", "Dynamic Entropy Confirmed: Challenges are fresh & unpredictable across sessions.", "success");
      }
    } catch (err: any) {
      log("RESULT", `FAILED: ${err.message}`, "error");
    }
  };

  // Test Case 5a: Legitimate Auth & Payload Interception
  const testCase5Legit = async () => {
    clearLogs();
    log("TEST CASE 5 (Part 1)", "Legitimate Auth & Payload Interception by Eavesdropper", "info");
    try {
      const res = await runAuthProtocol("alice", "MySecretKey123");
      setCapturedPayload({
        challenge_id: res.challenge_id,
        response: res.response,
        challenge: res.challenge,
      });
      log("EAVESDROPPER INTERCEPT", `Captured HMAC Response: ${res.response}`, "warn");
      log("RESULT", "Auth Passed. Sniffed payload stored in hacker buffer. Ready for Replay Attack.", "success");
    } catch (err: any) {
      log("RESULT", `FAILED: ${err.message}`, "error");
    }
  };

  // Test Case 5b: Replay Attack Execution
  const testCase5Replay = async () => {
    if (!capturedPayload) return;
    clearLogs();
    log("TEST CASE 5 (Part 2)", "Executing Replay Attack on New Session...", "warn");
    try {
      log("ATTACK PREP", "Attacker requesting fresh challenge for 'alice'...", "info");
      const res1 = await fetch(`${API_BASE}/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice" }),
      });
      const data1 = await res1.json();
      log("ATTACK", `New Session Issued Challenge: ${data1.challenge}`, "info");

      log("ATTACK INJECTION", `Replaying Sniffed Token (${capturedPayload.response.slice(0, 16)}...) against new Challenge ID...`, "warn");

      await runAuthProtocol("alice", "UNUSED_ATTACK_KEY", capturedPayload.response, data1.challenge_id, true);
      log("VULNERABILITY DETECTED", "Replay attack succeeded!", "error");
    } catch (err: any) {
      log("DEFENSE RESULT", `REPLAY ATTACK BLOCKED: ${err.message}`, "success");
    }
  };

  // Custom User Playground Run
  const handleCustomRun = () => {
    if (!inputUsername) return;
    clearLogs();
    log("CUSTOM RUN", `Testing credentials for '${inputUsername}'`, "info");
    runAuthProtocol(inputUsername, inputSecret).catch((err) => {
      log("CUSTOM RESULT", `Execution completed with error: ${err.message}`, "warn");
    });
  };

  const scrollToLab = () => {
    labRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", color: "#f1f5f9" }}>
      {/* 1. Background Video Layer */}
      <div className="bg-video-container">
        <video autoPlay muted loop playsInline className="bg-video">
          <source src={bgVideo} type="video/mp4" />
        </video>
      </div>
      <div className="bg-overlay" />

      {/* 2. Top Navigation Bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(3, 7, 18, 0.78)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(0, 240, 255, 0.15)",
          padding: "14px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #008cff, #00f0ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 15px rgba(0, 240, 255, 0.5)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#030712" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "16px", letterSpacing: "1px", color: "#ffffff", fontFamily: "var(--heading-font)" }}>
              CRYPTO<span style={{ color: "var(--neon-cyan)" }}>LAB</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "0.5px" }}>
              HMAC-SHA256 PROTOCOL ENGINE
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 8px #10b981" }} />
            API: Connected (localhost:8000)
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
            <span>Speed:</span>
            <select
              value={stepDelay}
              onChange={(e) => setStepDelay(Number(e.target.value))}
              style={{
                background: "rgba(15, 23, 42, 0.8)",
                color: "var(--neon-cyan)",
                border: "1px solid rgba(0, 240, 255, 0.3)",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value={850}>Cinematic (850ms)</option>
              <option value={400}>Fast (400ms)</option>
              <option value={50}>Instant (50ms)</option>
            </select>
          </div>
        </div>
      </header>

      {/* Fixed Left Sidebar - Protocol Event Console */}
      <aside className={`event-console-sidebar${consoleOpen ? " open" : ""}`}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexShrink: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--neon-cyan)", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            Event Console
            {logs.length > 0 && (
              <span style={{ fontSize: "10px", background: "rgba(0, 240, 255, 0.15)", color: "var(--neon-cyan)", padding: "2px 7px", borderRadius: "10px", fontWeight: 700, marginLeft: "4px" }}>
                {logs.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={clearLogs}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "11px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear
            </button>
            <button
              onClick={() => setConsoleOpen(false)}
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "var(--text-muted)",
                fontSize: "12px",
                cursor: "pointer",
                borderRadius: "4px",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              title="Collapse console"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            background: "rgba(3, 7, 18, 0.9)",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "14px",
            flex: 1,
            overflowY: "auto",
            fontFamily: "var(--mono-font)",
            fontSize: "11px",
            minHeight: 0,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ color: "var(--text-dim)", textAlign: "center", paddingTop: "40px" }}>
              $ Ready. Select a test case or click &apos;Run Handshake&apos; to monitor events...
            </div>
          ) : (
            logs.map((item, i) => (
              <div key={i} style={{ marginBottom: "6px", lineHeight: "1.5" }}>
                <span style={{ color: "#64748b", marginRight: "6px" }}>[{item.timestamp}]</span>
                <span
                  style={{
                    fontWeight: 700,
                    marginRight: "6px",
                    color:
                      item.status === "error"
                        ? "#ef4444"
                        : item.status === "success"
                        ? "#10b981"
                        : item.status === "warn"
                        ? "#f59e0b"
                        : "#00f0ff",
                  }}
                >
                  [{item.title}]
                </span>
                <span style={{ color: "#e2e8f0" }}>{item.detail}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </aside>

      {/* Toggle button to reopen console when collapsed */}
      {!consoleOpen && (
        <button
          className="console-toggle-btn"
          onClick={() => setConsoleOpen(true)}
          title="Open Protocol Console"
        >
          📋
        </button>
      )}

      <div className={consoleOpen ? "content-with-sidebar" : ""}>
      {/* 3. Hero Section */}
      <section
        style={{
          minHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "60px 24px 40px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 16px",
            borderRadius: "30px",
            background: "rgba(0, 140, 255, 0.12)",
            border: "1px solid rgba(0, 240, 255, 0.3)",
            fontSize: "13px",
            color: "var(--neon-cyan)",
            marginBottom: "24px",
            letterSpacing: "1px",
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: "14px" }}>⚡</span> NEXT-GEN CRYPTOGRAPHIC AUTHENTICATION
        </div>

        {/* Title with Blur-to-Sharp animation */}
        <h1
          className="hero-title-reveal"
          style={{
            fontSize: "clamp(32px, 5.5vw, 64px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.5px",
            margin: "0 0 20px 0",
            maxWidth: "960px",
            fontFamily: "var(--heading-font)",
            background: "linear-gradient(180deg, #ffffff 40%, rgba(200, 235, 255, 0.75) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 35px rgba(0, 140, 255, 0.35)",
          }}
        >
          HMAC-SHA256 Challenge Response Authentication
        </h1>

        {/* Hero Subtitle */}
        <p
          className="hero-subtitle-reveal"
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--text-muted)",
            maxWidth: "700px",
            margin: "0 0 36px 0",
            fontWeight: 400,
          }}
        >
          Secure challenge-response authentication using HMAC with SHA-256.
        </p>

        {/* Start Button */}
        <div className="hero-actions-reveal" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "28px" }}>
          <button id="start-auth-btn" onClick={scrollToLab} className="shadow__btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            START AUTHENTICATION
          </button>

          {/* Key Cryptographic Features */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            {[
              { label: "Zero-Knowledge Password Proof", icon: "🛡️" },
              { label: "128-Bit Dynamic Nonce", icon: "🎲" },
              { label: "Timing-Safe compare_digest", icon: "⏱️" },
              { label: "Replay Attack Immune", icon: "🔒" },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  color: "#cbd5e1",
                  background: "rgba(10, 22, 45, 0.5)",
                  backdropFilter: "blur(8px)",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Active Authentication Protocol Laboratory */}
      <main
        ref={labRef}
        id="demo-section"
        style={{
          maxWidth: "1160px",
          margin: "0 auto",
          padding: "40px 20px 80px",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Section Heading */}
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <h2
            style={{
              fontSize: "30px",
              fontWeight: 700,
              fontFamily: "var(--heading-font)",
              color: "#ffffff",
              letterSpacing: "0.5px",
              margin: "0 0 10px 0",
            }}
          >
            Authentication Protocol Visualizer
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "15px", maxWidth: "600px", margin: "0 auto" }}>
            Observe the real-time transmission and cryptographic validation sequence between the client and server.
          </p>
        </div>

        {/* 4.1 Preset Attack & Test Scenarios Control Bar */}
        <div className="glass-panel" style={{ padding: "24px", marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--neon-cyan)", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>🕹️</span> Protocol Test Suites & Attack Vectors
            </div>
            {capturedPayload && (
              <div style={{ fontSize: "12px", color: "#f59e0b", background: "rgba(245, 158, 11, 0.12)", padding: "4px 10px", borderRadius: "12px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                ⚠️ Intercepted Payload in Memory ({capturedPayload.response.slice(0, 10)}...)
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginBottom: "20px" }}>
            <button
              onClick={testCase1}
              disabled={isRunning}
              style={{
                padding: "12px 14px",
                background: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                color: "#10b981",
                borderRadius: "8px",
                cursor: isRunning ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "13px",
                transition: "all 0.2s",
                opacity: isRunning ? 0.6 : 1,
              }}
            >
              Case 1: Valid Auth
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>alice / MySecretKey123</span>
            </button>

            <button
              onClick={testCase2}
              disabled={isRunning}
              style={{
                padding: "12px 14px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#f87171",
                borderRadius: "8px",
                cursor: isRunning ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "13px",
                transition: "all 0.2s",
                opacity: isRunning ? 0.6 : 1,
              }}
            >
              Case 2: Wrong Secret
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>alice / WrongSecret123</span>
            </button>

            <button
              onClick={testCase3}
              disabled={isRunning}
              style={{
                padding: "12px 14px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                color: "#fbbf24",
                borderRadius: "8px",
                cursor: isRunning ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "13px",
                transition: "all 0.2s",
                opacity: isRunning ? 0.6 : 1,
              }}
            >
              Case 3: Unknown User
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>charlie / SomeSecret123</span>
            </button>

            <button
              onClick={testCase4}
              disabled={isRunning}
              style={{
                padding: "12px 14px",
                background: "rgba(59, 130, 246, 0.15)",
                border: "1px solid rgba(59, 130, 246, 0.4)",
                color: "#60a5fa",
                borderRadius: "8px",
                cursor: isRunning ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "13px",
                transition: "all 0.2s",
                opacity: isRunning ? 0.6 : 1,
              }}
            >
              Case 4: Fresh Nonces
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>2x Sessions dynamic check</span>
            </button>

            <button
              onClick={testCase5Legit}
              disabled={isRunning}
              style={{
                padding: "12px 14px",
                background: "rgba(168, 85, 247, 0.15)",
                border: "1px solid rgba(168, 85, 247, 0.4)",
                color: "#c084fc",
                borderRadius: "8px",
                cursor: isRunning ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: "13px",
                transition: "all 0.2s",
                opacity: isRunning ? 0.6 : 1,
              }}
            >
              Case 5a: Capture
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", fontWeight: 400, marginTop: "2px" }}>Legit Auth & Intercept</span>
            </button>

            <button
              onClick={testCase5Replay}
              disabled={isRunning || !capturedPayload}
              style={{
                padding: "12px 14px",
                background: capturedPayload ? "rgba(225, 29, 72, 0.25)" : "rgba(50, 50, 50, 0.2)",
                border: capturedPayload ? "1px solid rgba(225, 29, 72, 0.6)" : "1px solid rgba(255, 255, 255, 0.1)",
                color: capturedPayload ? "#fb7185" : "#64748b",
                borderRadius: "8px",
                cursor: isRunning || !capturedPayload ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: "13px",
                transition: "all 0.2s",
                boxShadow: capturedPayload ? "0 0 15px rgba(225, 29, 72, 0.4)" : "none",
              }}
            >
              Case 5b: Replay Attack
              <span style={{ display: "block", fontSize: "11px", color: capturedPayload ? "#fda4af" : "#475569", fontWeight: 400, marginTop: "2px" }}>
                {capturedPayload ? "Inject Sniffed Response" : "Capture payload first"}
              </span>
            </button>
          </div>

          {/* Custom Credentials Bar with Run Handshake button */}
          <div
            style={{
              paddingTop: "16px",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Custom Credentials:</span>
            <input
              type="text"
              placeholder="Username"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              disabled={isRunning}
              style={{
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(0, 240, 255, 0.25)",
                borderRadius: "6px",
                padding: "8px 12px",
                color: "#ffffff",
                fontSize: "13px",
                outline: "none",
                fontFamily: "var(--mono-font)",
                minWidth: "140px",
              }}
            />
            <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
              <input
                type={showSecret ? "text" : "password"}
                placeholder="Shared Secret Key"
                value={inputSecret}
                onChange={(e) => setInputSecret(e.target.value)}
                disabled={isRunning}
                style={{
                  background: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(0, 240, 255, 0.25)",
                  borderRadius: "6px",
                  padding: "8px 36px 8px 12px",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none",
                  fontFamily: "var(--mono-font)",
                  minWidth: "180px",
                }}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                style={{
                  position: "absolute",
                  right: "8px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: 0,
                  fontSize: "13px",
                }}
                title={showSecret ? "Hide secret" : "Show secret"}
              >
                {showSecret ? "👁️" : "🔒"}
              </button>
            </div>
            <button
              onClick={handleCustomRun}
              disabled={isRunning || !inputUsername}
              style={{
                background: "linear-gradient(135deg, #008cff, #00f0ff)",
                border: "none",
                color: "#030712",
                fontWeight: 700,
                fontSize: "13px",
                padding: "8px 20px",
                borderRadius: "6px",
                cursor: isRunning || !inputUsername ? "not-allowed" : "pointer",
                boxShadow: "0 0 18px rgba(0, 240, 255, 0.45)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>⚡</span> Run Handshake
            </button>
          </div>
        </div>

        {/* 4.2 Data Packet / Protocol Flow visualizer */}
        <div
          className="glass-panel"
          style={{
            padding: "24px",
            marginBottom: "32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--neon-cyan)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "20px" }}>
            Network Topology & In-Flight Cryptographic Packets
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              padding: "16px 10px",
            }}
          >
            {/* Client Node */}
            <div
              style={{
                width: "220px",
                padding: "16px",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(0, 240, 255, 0.4)",
                boxShadow: activeStep === 1 || activeStep === 5 || activeStep === 6 ? "0 0 20px rgba(0, 240, 255, 0.4)" : "none",
                transition: "all 0.3s",
                zIndex: 2,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "18px" }}>💻</span>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#ffffff" }}>CLIENT</span>
                <span style={{ fontSize: "10px", color: "#10b981", background: "rgba(16, 185, 129, 0.15)", padding: "2px 6px", borderRadius: "10px", marginLeft: "auto" }}>
                  WebCrypto
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--mono-font)" }}>
                192.168.1.45
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                User: <span style={{ color: "var(--neon-cyan)" }}>{sessionArtifacts.username || inputUsername}</span>
              </div>
            </div>

            {/* Glowing Connection Bus */}
            <div
              style={{
                flex: 1,
                height: "4px",
                background: "rgba(0, 240, 255, 0.15)",
                margin: "0 16px",
                position: "relative",
                borderRadius: "2px",
              }}
            >
              {/* Animated In-Transit Packet */}
              {packetDirection === "to-server" && (
                <div
                  className="packet-anim-right"
                  style={{
                    position: "absolute",
                    top: "50%",
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: "#00f0ff",
                    boxShadow: "0 0 15px #00f0ff, 0 0 30px #008cff",
                  }}
                />
              )}

              {packetDirection === "to-client" && (
                <div
                  className="packet-anim-left"
                  style={{
                    position: "absolute",
                    top: "50%",
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 15px #10b981, 0 0 30px #059669",
                  }}
                />
              )}

              {/* Packet Label floating in center */}
              {packetLabel && (
                <div
                  style={{
                    position: "absolute",
                    top: "-30px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                    fontSize: "11px",
                    fontFamily: "var(--mono-font)",
                    color: packetDirection === "to-server" ? "var(--neon-cyan)" : "#10b981",
                    background: "rgba(3, 7, 18, 0.9)",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    border: "1px solid rgba(0, 240, 255, 0.3)",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
                  }}
                >
                  {packetLabel}
                </div>
              )}
            </div>

            {/* Server Node */}
            <div
              style={{
                width: "220px",
                padding: "16px",
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(0, 140, 255, 0.4)",
                boxShadow: activeStep === 2 || activeStep === 3 || activeStep === 7 || activeStep === 8 ? "0 0 20px rgba(0, 140, 255, 0.5)" : "none",
                transition: "all 0.3s",
                zIndex: 2,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ fontSize: "18px" }}>🛡️</span>
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#ffffff" }}>SERVER</span>
                <span style={{ fontSize: "10px", color: "#008cff", background: "rgba(0, 140, 255, 0.15)", padding: "2px 6px", borderRadius: "10px", marginLeft: "auto" }}>
                  FastAPI
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--mono-font)" }}>
                127.0.0.1:8000
              </div>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                Replay Guard: <span style={{ color: "#10b981" }}>Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4.3 The 9 Step Execution Protocol in DOWN APPROACH (Vertical Sequential Timeline) */}
        <div ref={stepsSectionRef} id="execution-steps-section" style={{ marginBottom: "48px", scrollMarginTop: "80px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff", fontFamily: "var(--heading-font)", letterSpacing: "0.5px" }}>
                Execution Protocol Steps (1 - 9)
              </div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                Sequential top-down cryptographic handshake pipeline with dynamic tracking
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", background: "rgba(10, 20, 42, 0.7)", padding: "6px 14px", borderRadius: "20px", border: "1px solid rgba(0, 240, 255, 0.2)" }}>
              <span style={{ color: "var(--text-muted)" }}>Protocol Status:</span>
              {isRunning ? (
                <span style={{ color: "var(--neon-cyan)", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                  <span className="pulse-cyan" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--neon-cyan)", display: "inline-block" }} />
                  Step {activeStep} of 9 Active
                </span>
              ) : (
                <span style={{ color: "#94a3b8" }}>Standby</span>
              )}
            </div>
          </div>

          {/* Vertical Downward Timeline Container */}
          <div className="protocol-timeline">
            {/* STEP 1: Authentication Request */}
            <div id="step-row-1" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${activeStep === 1 ? "active" : steps[1].status === "done" ? "done" : ""}`}>
                  01
                </div>
                <div className={`timeline-connecting-line ${activeStep >= 1 ? "active" : ""}`} />
              </div>

              <div className="timeline-card-content">
                <div className={`glass-panel ${activeStep === 1 ? "glass-panel-active" : ""}`} style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--neon-cyan)", background: "rgba(0, 240, 255, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        CLIENT → SERVER
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 1: Authentication Request
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: steps[1].status === "done" ? "#10b981" : steps[1].status === "running" ? "var(--neon-cyan)" : "var(--text-dim)" }}>
                      {steps[1].status === "done" ? "✓ Completed" : steps[1].status === "running" ? "Transmitting..." : "Pending"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                    Client dispatches handshake initiation containing username. No sensitive secret or password is ever transmitted.
                  </p>
                  <div style={{ background: "rgba(3, 7, 18, 0.7)", padding: "10px 14px", borderRadius: "8px", fontFamily: "var(--mono-font)", fontSize: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ color: "var(--neon-cyan)" }}>POST /api/auth/challenge</div>
                    <div style={{ color: "#94a3b8", marginTop: "4px" }}>
                      payload: <span style={{ color: "#ffffff" }}>{JSON.stringify({ username: sessionArtifacts.username || inputUsername })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 2: Username Verification */}
            <div id="step-row-2" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${activeStep === 2 ? "active" : steps[2].status === "done" ? "done" : steps[2].status === "error" ? "error" : ""}`}>
                  02
                </div>
                <div className={`timeline-connecting-line ${activeStep >= 2 ? "active" : ""}`} />
              </div>

              <div className="timeline-card-content">
                <div className={`glass-panel ${activeStep === 2 ? "glass-panel-active" : ""}`} style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--neon-blue)", background: "rgba(0, 140, 255, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        SERVER INTERNAL
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 2: Username Verification
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: steps[2].status === "done" ? "#10b981" : steps[2].status === "error" ? "#ef4444" : steps[2].status === "running" ? "var(--neon-cyan)" : "var(--text-dim)" }}>
                      {steps[2].status === "done" ? "✓ Verified" : steps[2].status === "error" ? "✗ User Not Found" : steps[2].status === "running" ? "Scanning DB..." : "Pending"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                    Server inspects authentication records in USER_DB to verify that the username is enrolled before generating a challenge.
                  </p>
                  <div style={{ background: "rgba(3, 7, 18, 0.7)", padding: "10px 14px", borderRadius: "8px", fontFamily: "var(--mono-font)", fontSize: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ color: "#008cff" }}>DATABASE LOOKUP</div>
                    <div style={{ color: steps[2].status === "error" ? "#ef4444" : "#10b981", marginTop: "4px" }}>
                      {steps[2].status === "running" ? "Scanning records for user..." : steps[2].status === "done" ? "Username verified ✓" : steps[2].status === "error" ? "HTTP 404: User not found in database ✗" : "Awaiting request"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 3: Generate Random Challenge */}
            <div id="step-row-3" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${activeStep === 3 ? "active" : steps[3].status === "done" ? "done" : ""}`}>
                  03
                </div>
                <div className={`timeline-connecting-line ${activeStep >= 3 ? "active" : ""}`} />
              </div>

              <div className="timeline-card-content">
                <div className={`glass-panel ${activeStep === 3 ? "glass-panel-active" : ""}`} style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981", background: "rgba(16, 185, 129, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        SERVER CSPRNG
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 3: Generate Cryptographic Nonce Challenge
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: steps[3].status === "done" ? "#10b981" : steps[3].status === "running" ? "var(--neon-cyan)" : "var(--text-dim)" }}>
                      {steps[3].status === "done" ? "✓ Generated" : steps[3].status === "running" ? "Gathering Entropy..." : "Pending"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                    Server generates a fresh, dynamic 128-bit random token (C) using secure entropy (<code style={{ color: "var(--neon-cyan)" }}>secrets.token_hex(16)</code>).
                  </p>
                  <div style={{ background: "rgba(3, 7, 18, 0.7)", padding: "10px 14px", borderRadius: "8px", fontFamily: "var(--mono-font)", fontSize: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ color: "#10b981" }}>CHALLENGE TOKEN (16 Bytes / 128-Bit Hex)</div>
                    <div style={{ color: "#ffffff", marginTop: "4px", wordBreak: "break-all" }}>
                      {sessionArtifacts.challenge ? sessionArtifacts.challenge : "0x00000000000000000000000000000000"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4: Send Challenge */}
            <div id="step-row-4" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${activeStep === 4 ? "active" : steps[4].status === "done" ? "done" : ""}`}>
                  04
                </div>
                <div className={`timeline-connecting-line ${activeStep >= 4 ? "active" : ""}`} />
              </div>

              <div className="timeline-card-content">
                <div className={`glass-panel ${activeStep === 4 ? "glass-panel-active" : ""}`} style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--neon-cyan)", background: "rgba(0, 240, 255, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        SERVER → CLIENT
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 4: Transmit Challenge to Client
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: steps[4].status === "done" ? "#10b981" : steps[4].status === "running" ? "var(--neon-cyan)" : "var(--text-dim)" }}>
                      {steps[4].status === "done" ? "✓ Delivered" : steps[4].status === "running" ? "Transmitting..." : "Pending"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                    Server stores the temporary challenge with a 120s TTL and transmits the challenge nonce and session challenge_id to the client.
                  </p>
                  <div style={{ background: "rgba(3, 7, 18, 0.7)", padding: "10px 14px", borderRadius: "8px", fontFamily: "var(--mono-font)", fontSize: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ color: "var(--neon-cyan)" }}>RESPONSE 200 OK</div>
                    <div style={{ color: "#94a3b8", marginTop: "4px" }}>
                      challenge_id: <span style={{ color: "#ffffff" }}>{sessionArtifacts.challenge_id ? sessionArtifacts.challenge_id : "pending"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 5: HMAC-SHA256 Calculation (Featured Card) */}
            <div id="step-row-5" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${activeStep === 5 ? "active" : steps[5].status === "done" ? "done" : ""}`}>
                  05
                </div>
                <div className={`timeline-connecting-line ${activeStep >= 5 ? "active" : ""}`} />
              </div>

              <div className="timeline-card-content">
                <div
                  className={`glass-panel ${activeStep === 5 ? "glass-panel-active" : ""}`}
                  style={{
                    padding: "24px",
                    borderColor: activeStep === 5 ? "var(--neon-cyan)" : "rgba(0, 240, 255, 0.35)",
                    background: activeStep === 5 ? "rgba(10, 25, 55, 0.85)" : "rgba(8, 18, 38, 0.65)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, background: "linear-gradient(135deg, #008cff, #00f0ff)", padding: "2px 8px", borderRadius: "4px", color: "#030712" }}>
                        CLIENT CRYPTO CORE
                      </span>
                      <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 5: HMAC-SHA256 Response Computation
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: steps[5].status === "done" ? "#10b981" : steps[5].status === "running" ? "var(--neon-cyan)" : "var(--text-dim)" }}>
                      {steps[5].status === "done" ? "✓ Digest Computed" : steps[5].status === "running" ? "Hashing Engine..." : "Pending"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 16px 0" }}>
                    Client calculates the HMAC signature using its local shared secret key and the server&apos;s random challenge nonce.
                  </p>

                  {/* Prominent Formula */}
                  <div
                    style={{
                      background: "rgba(0, 140, 255, 0.09)",
                      border: "1px solid rgba(0, 240, 255, 0.35)",
                      borderRadius: "12px",
                      padding: "16px",
                      marginBottom: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontFamily: "var(--heading-font)", fontSize: "20px", fontWeight: 800, letterSpacing: "1px", color: "#ffffff" }}>
                      R = HMAC-SHA256(K, C)
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                      K = Shared Secret Key &nbsp;|&nbsp; C = Random Challenge &nbsp;|&nbsp; R = Authentication Response
                    </div>
                  </div>

                  {/* Cryptographic Calculation Sequence Pipeline */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1.2fr", gap: "8px", alignItems: "center", textAlign: "center", fontSize: "12px", fontFamily: "var(--mono-font)" }}>
                    <div style={{ background: "rgba(3, 7, 18, 0.8)", padding: "10px 8px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "2px" }}>CHALLENGE (C)</div>
                      <div style={{ color: "#ffffff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sessionArtifacts.challenge ? sessionArtifacts.challenge.slice(0, 10) + "..." : "Dynamic Nonce"}
                      </div>
                    </div>
                    <span style={{ color: "var(--neon-cyan)", fontWeight: 700, fontSize: "16px" }}>+</span>
                    <div style={{ background: "rgba(3, 7, 18, 0.8)", padding: "10px 8px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "10px", marginBottom: "2px" }}>SHARED SECRET (K)</div>
                      <div style={{ color: "var(--neon-cyan)" }}>
                        {showSecret ? inputSecret : "••••••••••••"}
                      </div>
                    </div>
                    <span style={{ color: "var(--neon-cyan)", fontWeight: 700, fontSize: "16px" }}>→</span>
                    <div style={{ background: "rgba(3, 7, 18, 0.8)", padding: "10px 8px", borderRadius: "8px", border: "1px solid rgba(0, 240, 255, 0.35)" }}>
                      <div style={{ color: "#10b981", fontSize: "10px", marginBottom: "2px" }}>OUTPUT RESPONSE (R)</div>
                      <div style={{ color: "#10b981", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {sessionArtifacts.hmac_response ? sessionArtifacts.hmac_response.slice(0, 12) + "..." : "Awaiting Digest"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 6: Client Sends Response */}
            <div id="step-row-6" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${activeStep === 6 ? "active" : steps[6].status === "done" ? "done" : ""}`}>
                  06
                </div>
                <div className={`timeline-connecting-line ${activeStep >= 6 ? "active" : ""}`} />
              </div>

              <div className="timeline-card-content">
                <div className={`glass-panel ${activeStep === 6 ? "glass-panel-active" : ""}`} style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--neon-cyan)", background: "rgba(0, 240, 255, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        CLIENT → SERVER
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 6: Client Sends Response Digest
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: steps[6].status === "done" ? "#10b981" : steps[6].status === "running" ? "var(--neon-cyan)" : "var(--text-dim)" }}>
                      {steps[6].status === "done" ? "✓ Delivered" : steps[6].status === "running" ? "Dispatching..." : "Pending"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                    Client transmits only the calculated HMAC signature and the session identifier to the server for verification.
                  </p>
                  <div style={{ background: "rgba(3, 7, 18, 0.7)", padding: "10px 14px", borderRadius: "8px", fontFamily: "var(--mono-font)", fontSize: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ color: "var(--neon-cyan)" }}>POST /api/auth/verify</div>
                    <div style={{ color: "#94a3b8", marginTop: "4px", wordBreak: "break-all" }}>
                      response: &quot;<span style={{ color: "#10b981" }}>{sessionArtifacts.hmac_response ? sessionArtifacts.hmac_response : "awaiting computation"}</span>&quot;
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 7: Server Calculates Expected Response */}
            <div id="step-row-7" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${activeStep === 7 ? "active" : steps[7].status === "done" ? "done" : ""}`}>
                  07
                </div>
                <div className={`timeline-connecting-line ${activeStep >= 7 ? "active" : ""}`} />
              </div>

              <div className="timeline-card-content">
                <div className={`glass-panel ${activeStep === 7 ? "glass-panel-active" : ""}`} style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--neon-blue)", background: "rgba(0, 140, 255, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        SERVER CRYPTO
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 7: Server Calculates Expected HMAC
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: steps[7].status === "done" ? "#10b981" : steps[7].status === "running" ? "var(--neon-cyan)" : "var(--text-dim)" }}>
                      {steps[7].status === "done" ? "✓ Computed" : steps[7].status === "running" ? "Computing Benchmark..." : "Pending"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                    Server retrieves its stored key for the user and computes its own expected HMAC using Python <code style={{ color: "var(--neon-cyan)" }}>hmac.new()</code>.
                  </p>
                  <div style={{ background: "rgba(3, 7, 18, 0.7)", padding: "10px 14px", borderRadius: "8px", fontFamily: "var(--mono-font)", fontSize: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ color: "#008cff" }}>SERVER EXPECTED DIGEST: HMAC-SHA256(USER_DB[user], C)</div>
                    <div style={{ color: "#10b981", marginTop: "4px" }}>
                      {steps[7].status === "done" ? "Expected response successfully generated for comparison" : "Awaiting payload"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 8: Secure Comparison */}
            <div id="step-row-8" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${activeStep === 8 ? "active" : steps[8].status === "done" ? "done" : steps[8].status === "error" ? "error" : ""}`}>
                  08
                </div>
                <div className={`timeline-connecting-line ${activeStep >= 8 ? "active" : ""}`} />
              </div>

              <div className="timeline-card-content">
                <div className={`glass-panel ${activeStep === 8 ? "glass-panel-active" : ""}`} style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#a855f7", background: "rgba(168, 85, 247, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                        SERVER COMPARISON
                      </span>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 8: Constant-Time Secure Comparison
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", color: steps[8].status === "done" ? "#10b981" : steps[8].status === "error" ? "#ef4444" : steps[8].status === "running" ? "var(--neon-cyan)" : "var(--text-dim)" }}>
                      {steps[8].status === "done" ? "✓ Timing-Safe Match" : steps[8].status === "error" ? "✗ Mismatch" : steps[8].status === "running" ? "Comparing..." : "Pending"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 12px 0" }}>
                    Executes <code style={{ color: "var(--neon-cyan)" }}>hmac.compare_digest(expected, received)</code> in constant time to prevent timing side-channel attacks.
                  </p>
                  <div style={{ background: "rgba(3, 7, 18, 0.7)", padding: "10px 14px", borderRadius: "8px", fontFamily: "var(--mono-font)", fontSize: "12px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    <div style={{ color: "#a855f7" }}>SECURE TIMING EQUALITY: compare_digest()</div>
                    <div style={{ color: steps[8].status === "error" ? "#ef4444" : "#10b981", marginTop: "4px" }}>
                      {steps[8].status === "done" ? "Received Response == Expected Response (Match ✓)" : steps[8].status === "error" ? "Verification failed: response does not match expected digest ✗" : "Ready for comparison"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 9: Authentication Result */}
            <div id="step-row-9" className="timeline-step-row">
              <div className="timeline-track-col">
                <div className={`timeline-node-badge ${steps[9].status === "done" ? "done" : steps[9].status === "error" ? "error" : activeStep === 9 ? "active" : ""}`}>
                  09
                </div>
              </div>

              <div className="timeline-card-content">
                <div
                  className={`glass-panel ${activeStep === 9 ? "glass-panel-active" : ""}`}
                  style={{
                    padding: "24px",
                    borderColor: steps[9].status === "done" ? "#10b981" : steps[9].status === "error" ? "#ef4444" : "var(--border-cyan)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: steps[9].status === "done" ? "#10b981" : steps[9].status === "error" ? "#ef4444" : "var(--neon-cyan)", background: "rgba(255, 255, 255, 0.08)", padding: "2px 8px", borderRadius: "4px" }}>
                        FINAL OUTCOME
                      </span>
                      <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                        Step 9: Authentication Verdict
                      </h3>
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: steps[9].status === "done" ? "#10b981" : steps[9].status === "error" ? "#ef4444" : "var(--text-dim)" }}>
                      {steps[9].status === "done" ? "AUTHORIZED" : steps[9].status === "error" ? "REJECTED" : "AWAITING"}
                    </span>
                  </div>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 14px 0" }}>
                    Dynamic server outcome. The session challenge token is permanently consumed, preventing any subsequent replay attempts.
                  </p>
                  <div
                    style={{
                      background: steps[9].status === "done" ? "rgba(16, 185, 129, 0.16)" : steps[9].status === "error" ? "rgba(239, 68, 68, 0.16)" : "rgba(3, 7, 18, 0.7)",
                      border: steps[9].status === "done" ? "1px solid rgba(16, 185, 129, 0.45)" : steps[9].status === "error" ? "1px solid rgba(239, 68, 68, 0.45)" : "1px solid rgba(255, 255, 255, 0.06)",
                      padding: "14px",
                      borderRadius: "10px",
                      fontFamily: "var(--mono-font)",
                      fontSize: "12px",
                    }}
                  >
                    {steps[9].status === "done" && (
                      <div style={{ color: "#10b981", fontWeight: 700, fontSize: "14px" }}>
                        ✓ AUTHENTICATION SUCCESSFUL
                        <div style={{ color: "#ffffff", fontWeight: 400, fontSize: "12px", marginTop: "4px" }}>{sessionArtifacts.server_result}</div>
                      </div>
                    )}
                    {steps[9].status === "error" && (
                      <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "14px" }}>
                        ✕ AUTHENTICATION FAILED
                        <div style={{ color: "#fca5a5", fontWeight: 400, fontSize: "12px", marginTop: "4px" }}>{steps[9].detail}</div>
                      </div>
                    )}
                    {steps[9].status !== "done" && steps[9].status !== "error" && (
                      <div style={{ color: "var(--text-dim)" }}>Protocol idle. Click &apos;Run Handshake&apos; or a test case above to begin execution.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4.4 Session Cryptography Inspector */}
        <div>
          {/* Cryptography Artifacts Inspector */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--neon-cyan)", textTransform: "uppercase", letterSpacing: "1px" }}>
                Session Cryptography Inspector
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Active Nonce & Tokens</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "12px", fontFamily: "var(--mono-font)" }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>CHALLENGE ID (SINGLE-USE STORE KEY)</div>
                <div style={{ color: "#ffffff", background: "rgba(3, 7, 18, 0.6)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.06)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {sessionArtifacts.challenge_id || "None active"}
                </div>
              </div>

              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>DYNAMIC CHALLENGE NONCE (128-BIT HEX)</div>
                <div style={{ color: "var(--neon-cyan)", background: "rgba(3, 7, 18, 0.6)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.06)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {sessionArtifacts.challenge || "None generated"}
                </div>
              </div>

              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "10px" }}>HMAC-SHA256 SIGNATURE (256-BIT DIGEST)</div>
                <div style={{ color: "#10b981", background: "rgba(3, 7, 18, 0.6)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255, 255, 255, 0.06)", wordBreak: "break-all" }}>
                  {sessionArtifacts.hmac_response || "Awaiting computation"}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                <button
                  onClick={() => {
                    if (sessionArtifacts.hmac_response) {
                      navigator.clipboard.writeText(sessionArtifacts.hmac_response);
                      alert("HMAC response copied to clipboard!");
                    }
                  }}
                  disabled={!sessionArtifacts.hmac_response}
                  style={{
                    background: "rgba(0, 240, 255, 0.1)",
                    border: "1px solid rgba(0, 240, 255, 0.3)",
                    color: "var(--neon-cyan)",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    cursor: sessionArtifacts.hmac_response ? "pointer" : "not-allowed",
                  }}
                >
                  Copy HMAC Digest
                </button>
                <button
                  onClick={() => {
                    if (sessionArtifacts.challenge) {
                      navigator.clipboard.writeText(sessionArtifacts.challenge);
                      alert("Challenge copied to clipboard!");
                    }
                  }}
                  disabled={!sessionArtifacts.challenge}
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#ffffff",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    cursor: sessionArtifacts.challenge ? "pointer" : "not-allowed",
                  }}
                >
                  Copy Challenge Nonce
                </button>
              </div>
            </div>
          </div>

          {/* Live Cyber Security Event Console */}
          <div className="glass-panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--neon-cyan)", textTransform: "uppercase", letterSpacing: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                Protocol Event Console
              </div>
              <button
                onClick={clearLogs}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "11px",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Clear Log
              </button>
            </div>

            <div
              style={{
                background: "rgba(3, 7, 18, 0.9)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "14px",
                height: "230px",
                overflowY: "auto",
                fontFamily: "var(--mono-font)",
                fontSize: "11px",
              }}
            >
              {logs.length === 0 ? (
                <div style={{ color: "var(--text-dim)", textAlign: "center", paddingTop: "80px" }}>
                  $ Ready. Select a test case or click &apos;Run Handshake&apos; to monitor events...
                </div>
              ) : (
                logs.map((item, i) => (
                  <div key={i} style={{ marginBottom: "6px", lineHeight: "1.5" }}>
                    <span style={{ color: "#64748b", marginRight: "6px" }}>[{item.timestamp}]</span>
                    <span
                      style={{
                        fontWeight: 700,
                        marginRight: "6px",
                        color:
                          item.status === "error"
                            ? "#ef4444"
                            : item.status === "success"
                            ? "#10b981"
                            : item.status === "warn"
                            ? "#f59e0b"
                            : "#00f0ff",
                      }}
                    >
                      [{item.title}]
                    </span>
                    <span style={{ color: "#e2e8f0" }}>{item.detail}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(3, 7, 18, 0.8)",
          padding: "24px",
          textAlign: "center",
          fontSize: "12px",
          color: "var(--text-dim)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div>HMAC-SHA256 Cryptographic Challenge-Response Protocol Demonstration</div>
        <div style={{ marginTop: "4px", color: "#475569" }}>
          Protected with single-use nonce storage and constant-time string digest comparison.
        </div>
      </footer>
      </div>
    </div>
  );
}