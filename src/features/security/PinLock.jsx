import { useEffect, useRef, useState, useCallback } from "react";

// Wrap your signed-in app: <PinLock userId={user.id} onForgot={signOut}><App/></PinLock>
// The PIN is hashed (SHA-256 + salt) and stored on this phone only.
const key = (id) => `dl_pin_${id}`;
async function hash(pin, salt) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + pin));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function PinLock({ userId, idleMs = 60000, onForgot, children }) {
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem(key(userId))); } catch { return null; } });
  const [locked, setLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [msg, setMsg] = useState("");
  const [fails, setFails] = useState(0);
  const [until, setUntil] = useState(0);
  const hiddenAt = useRef(0);
  const idle = useRef(null);

  const lock = useCallback(() => { setLocked(true); setPin(""); }, []);
  useEffect(() => {
    if (!saved || locked) return;
    const reset = () => { clearTimeout(idle.current); idle.current = setTimeout(lock, idleMs); };
    const vis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > 15000) lock();
    };
    ["touchstart", "keydown", "click"].forEach((e) => window.addEventListener(e, reset));
    document.addEventListener("visibilitychange", vis);
    reset();
    return () => {
      clearTimeout(idle.current);
      ["touchstart", "keydown", "click"].forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", vis);
    };
  }, [saved, locked, idleMs, lock]);

  async function submit(p) {
    if (Date.now() < until) return setMsg("Too many tries. Wait a moment.");
    if (!saved) {
      if (!first) { setFirst(p); setPin(""); return setMsg("Enter the PIN again to confirm."); }
      if (first !== p) { setFirst(""); setPin(""); return setMsg("PINs did not match. Start again."); }
      const salt = crypto.getRandomValues(new Uint32Array(2)).join("-");
      const rec = { salt, h: await hash(p, salt) };
      localStorage.setItem(key(userId), JSON.stringify(rec));
      setSaved(rec); setLocked(false); setPin(""); setMsg(""); return;
    }
    if ((await hash(p, saved.salt)) === saved.h) { setLocked(false); setPin(""); setMsg(""); setFails(0); return; }
    const f = fails + 1; setFails(f); setPin("");
    if (f >= 5) { setUntil(Date.now() + 30000); setFails(0); setMsg("Locked for 30 seconds."); }
    else setMsg(`Wrong PIN. ${5 - f} tries left.`);
  }

  if (!locked) return children;
  const tap = (d) => { const n = (pin + d).slice(0, 4); setPin(n); if (n.length === 4) submit(n); };
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0b1d3a", color: "#fff", padding: 16 }}>
      <div style={{ textAlign: "center", width: 280 }}>
        <h3>{saved ? "Enter your PIN" : first ? "Confirm your PIN" : "Create a 4-digit PIN"}</h3>
        <div style={{ fontSize: 28, letterSpacing: 12, height: 40 }}>{"●".repeat(pin.length)}</div>
        <div style={{ minHeight: 20, fontSize: 13, color: "#ffd166" }}>{msg}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 8 }}>
          {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((d, i) => (
            <button key={i} disabled={d === ""} onClick={() => d === "⌫" ? setPin(pin.slice(0, -1)) : tap(String(d))}
              style={{ padding: 16, fontSize: 20, borderRadius: 12, border: 0, background: d === "" ? "transparent" : "#1d3557", color: "#fff" }}>{d}</button>
          ))}
        </div>
        {saved && onForgot && <button onClick={onForgot} style={{ marginTop: 16, background: "none", border: 0, color: "#9cc" }}>Forgot PIN? Sign out</button>}
      </div>
    </div>
  );
}
