import { useState } from "react";
import { ShieldAlert, AlertTriangle } from "lucide-react";

export function Disclaimer({ onAccept }) {
  const [a, setA] = useState(false), [b, setB] = useState(false);
  return (
    <div className="gate"><div className="gate-card">
      <div className="ic"><ShieldAlert size={24} /></div>
      <h2>Before you start</h2>
      <p>VoxelScope is an educational project. Its output can be wrong and must never be used for diagnosis or treatment.</p>
      <label><input type="checkbox" checked={a} onChange={(e) => setA(e.target.checked)} /> I understand this is not a medical device and not for diagnosis.</label>
      <label><input type="checkbox" checked={b} onChange={(e) => setB(e.target.checked)} /> I will only upload public or anonymised scans, never real patient data.</label>
      <button className="btn btn-p" disabled={!(a && b)} onClick={onAccept}>Continue to dashboard</button>
    </div></div>
  );
}

export function Warn({ res }) {
  const w = [];
  if (res.num_findings === 0) w.push("No spleen was found. Check that this is an abdominal CT.");
  else if (res.volume_ml < 30 || res.volume_ml > 1000) w.push(`Volume ${res.volume_ml} ml is outside the usual spleen range. Treat this result with caution.`);
  w.push("AI output can be wrong. Always check it against the scan.");
  return <>{w.map((t, i) => <div className="warn" key={i}><AlertTriangle size={16} />{t}</div>)}</>;
}