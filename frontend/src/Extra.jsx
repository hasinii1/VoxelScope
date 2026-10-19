import { useEffect, useState } from "react";
import { Database, Brain, ShieldCheck } from "lucide-react";
import { get } from "./api.js";

export default function Extra() {
  const [d, setD] = useState({ s: [], j: [], m: [] });
  useEffect(() => { Promise.all([get("/studies"), get("/jobs"), get("/models")]).then(([s, j, m]) => setD({ s, j, m })).catch(() => {}); }, []);
  const ok = d.j.filter((j) => j.status === "done").length;
  const m = d.m.find((x) => x.available);
  return (
    <div className="mgrid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
      <div className="panel mc"><div className="ic"><Database size={22} /></div><h3>Database</h3><p>SQLite file: voxelscope.db</p>
        <div className="big-n">{d.s.length + d.j.length}</div><p>{d.s.length} studies · {d.j.length} jobs · {ok} finished</p></div>
      <div className="panel mc"><div className="ic"><Brain size={22} /></div><h3>Model</h3>
        {m ? (<><p>{m.name} · {m.dataset}</p><div className="big-n">{m.dice.toFixed(2)}</div><p>validation Dice</p></>) : <p>Loading...</p>}</div>
      <div className="panel mc"><div className="ic"><ShieldCheck size={22} /></div><h3>Privacy</h3>
        <p>Patient headers are dropped at upload. Only pixel data and scan geometry are stored.</p></div>
    </div>
  );
}