import { useState } from "react";
import { LEGAL, LEGAL_VERSION } from "./legalText";

// Use at signup (pass onAccept) or in Settings (omit onAccept).
export default function LegalScreen({ onAccept }) {
  const [tab, setTab] = useState("terms");
  const [agreed, setAgreed] = useState(false);
  const doc = LEGAL[tab];
  return (
    <div style={{ padding: 16, maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {Object.keys(LEGAL).map((k) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: "1px solid #ccc",
              background: tab === k ? "#1a56db" : "#fff", color: tab === k ? "#fff" : "#222" }}>
            {LEGAL[k].title}
          </button>
        ))}
      </div>
      <h2 style={{ margin: "8px 0" }}>{doc.title}</h2>
      {doc.sections.map(([h, t]) => (
        <section key={h} style={{ marginBottom: 12 }}>
          <h4 style={{ margin: "0 0 4px" }}>{h}</h4>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{t}</p>
        </section>
      ))}
      <p style={{ fontSize: 12, opacity: 0.6 }}>Version {LEGAL_VERSION}</p>
      {onAccept && (
        <>
          <label style={{ display: "flex", gap: 8, margin: "12px 0" }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I accept the Terms, Privacy Policy and receipt fee notice.
          </label>
          <button disabled={!agreed} onClick={() => onAccept(LEGAL_VERSION)}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: 0, background: agreed ? "#1a56db" : "#9aa", color: "#fff" }}>
            Accept and continue
          </button>
        </>
      )}
    </div>
  );
}
