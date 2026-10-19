import { useEffect, useState } from "react";
import { LayoutDashboard, ScanLine, FolderOpen, ClipboardList, Info, UploadCloud, Activity, Timer, Gauge, Home, ArrowLeft, ArrowRight, Brain, ShieldCheck, FileText, Cpu, Layers, AlertTriangle, Check } from "lucide-react";
import { get } from "./api.js";
import Analyze from "./Analyze.jsx";
import Extra from "./Extra.jsx";
import { Disclaimer } from "./Guard.jsx";

function Overview({ go }) {
  const [d, setD] = useState({ s: [], j: [], m: [] });
  useEffect(() => { Promise.all([get("/studies"), get("/jobs"), get("/models")]).then(([s, j, m]) => setD({ s, j, m })).catch(() => {}); }, []);
  const done = d.j.filter((x) => x.status === "done");
  const t = done.map((x) => x.inference_seconds).filter(Boolean);
  const avg = t.length ? (t.reduce((a, b) => a + b, 0) / t.length).toFixed(1) : "-";
  const best = Math.max(0, ...d.m.map((x) => x.dice || 0));
  const last = done.slice(0, 7).reverse();
  const mx = Math.max(1, ...last.map((x) => x.inference_seconds || 0));
  const cards = [["Scans uploaded", d.s.length, UploadCloud], ["Analyses completed", done.length, Activity], ["Avg inference (s)", avg, Timer], ["Model Dice", best ? best.toFixed(2) : "-", Gauge]];
  const qs = [["1. Import a scan", "Open Analyze and import a .nii.gz CT or a DICOM zip."], ["2. Run the model", "The spleen model takes about 15 to 35 seconds on CPU."], ["3. Explore", "Scroll the slices, change the mask opacity and read the findings."]];
  return (
    <>
      <div className="hi">
        <div><h3>Analyse a CT scan in minutes</h3><p>Upload an abdominal CT, run the spleen model and explore the AI mask in 3D with measured volumes.</p>
          <button className="btn btn-s" onClick={() => go("analyze")}>Open Analyze <ArrowRight size={16} /></button></div>
        <Brain size={84} opacity={0.35} />
      </div>
      <div className="stats">
        {cards.map(([l, v, I]) => (<div className="stat" key={l}><div><small>{l}</small><b>{v}</b></div><div className="ic"><I size={20} /></div></div>))}
      </div>
      <div className="grid2">
        <div className="panel"><h3>Inference time per job (s)</h3>
          {last.length === 0 ? <p className="empty">Run an analysis to see timings.</p> : (
            <div className="bars">{last.map((x) => (<div className="bar" key={x.id}>{x.inference_seconds}<i style={{ height: `${((x.inference_seconds || 0) / mx) * 85}%` }} />#{x.id}</div>))}</div>)}
        </div>
        <div className="panel"><h3>Quick start</h3>
          {qs.map(([a, b]) => (<div className="fi" key={a}><b>{a}</b>{b}</div>))}
        </div>
      </div>
    </>
  );
}

function Studies({ open }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { get("/studies").then(setRows).catch(() => {}); }, []);
  return (
    <div className="panel"><h3>Uploaded scans</h3>
      {rows.length === 0 ? <p className="empty">No scans yet. Upload one in Analyze.</p> : (
        <table><thead><tr><th>ID</th><th>File</th><th>Type</th><th>Shape</th><th>Spacing (mm)</th><th>Uploaded</th><th /></tr></thead>
          <tbody>{rows.map((s) => (<tr key={s.id}><td>#{s.id}</td><td>{s.filename}</td><td>{s.file_type}</td><td>{s.shape.join(" × ")}</td>
            <td>{s.spacing_mm.map((v) => v.toFixed(2)).join(" × ")}</td><td>{new Date(s.uploaded_at + "Z").toLocaleString()}</td>
            <td><button className="btn btn-p btn-s" onClick={() => open(s.id)}>Open</button></td></tr>))}</tbody></table>)}
    </div>
  );
}

function Results() {
  const [rows, setRows] = useState(null);
  useEffect(() => { (async () => {
    const jobs = (await get("/jobs")).filter((j) => j.status === "done");
    setRows(await Promise.all(jobs.map(async (j) => ({ ...j, r: await get(`/jobs/${j.id}/result`).catch(() => null) }))));
  })().catch(() => setRows([])); }, []);
  return (
    <div className="panel"><h3>Completed analyses</h3>
      {!rows ? <p className="empty">Loading...</p> : rows.length === 0 ? <p className="empty">No finished analyses yet.</p> : (
        <table><thead><tr><th>Job</th><th>Study</th><th>Model</th><th>Findings</th><th>Volume (ml)</th><th>Time (s)</th><th>Device</th></tr></thead>
          <tbody>{rows.map((j) => (<tr key={j.id}><td>#{j.id}</td><td>#{j.study_id}</td><td>{j.model_name}</td><td>{j.r?.num_findings ?? "-"}</td><td>{j.r?.volume_ml ?? "-"}</td><td>{j.inference_seconds}</td><td>{j.device}</td></tr>))}</tbody></table>)}
    </div>
  );
}

const flow = [["Upload", "DICOM or NIfTI"], ["Convert", "One NIfTI, headers dropped"], ["Preprocess", "MONAI resample and scale"], ["Segment", "3D UNet, sliding window"], ["Measure", "Largest region, volume, box"], ["View", "Multi-planar 3D viewer"]];

function About() {
  return (
    <>
      <div className="ab-hero">
        <h3>About VoxelScope</h3>
        <p>An educational pipeline that turns an abdominal CT scan into a spleen mask, a measured volume and a 3D box, shown in a browser viewer. It was built with MONAI, FastAPI and React.</p>
        <div className="ab-nums" style={{ gridTemplateColumns: "repeat(2,1fr)", maxWidth: 520 }}>
          <div><b>0.90</b><small>validation Dice</small></div>
          <div><b>3D UNet</b><small>MONAI and PyTorch</small></div>
        </div>
      </div>
      <div className="panel"><h3>How the pipeline works</h3>
        <div className="flow">{flow.map(([t, s], i) => (<div key={t}><i>{i + 1}</i><b>{t}</b>{s}</div>))}</div>
      </div>
      <div className="ab-grid">
        <div className="panel"><h3>Privacy and safety</h3>
          <ul><li><ShieldCheck size={17} />DICOM headers are dropped, so patient identity is not stored.</li>
            <li><FileText size={17} />Only public, anonymised datasets are used.</li>
            <li><AlertTriangle size={17} />Educational project. Not a medical device. Not for diagnosis.</li></ul></div>
        <div className="panel"><h3>Data</h3>
          <ul><li><Check size={17} />Medical Segmentation Decathlon, Task09 Spleen.</li>
            <li><Check size={17} />Abdominal CT scans with expert spleen outlines.</li>
            <li><Layers size={17} />Licence: CC BY-SA 4.0.</li></ul></div>
        <div className="panel" style={{ gridColumn: "span 2" }}><h3>Tech stack</h3>
          <div className="tags">{["MONAI", "PyTorch", "FastAPI", "SQLAlchemy", "SimpleITK", "pydicom", "React", "Niivue"].map((x) => <span key={x}>{x}</span>)}</div></div>
      </div>
    </>
  );
}

function SideStatus() {
  const [up, setUp] = useState(null);
  useEffect(() => { get("/health").then(() => setUp(true)).catch(() => setUp(false)); }, []);
  return (
    <div className="side-st"><b><i className={`dot2 ${up === false ? "off" : ""}`} />{up === false ? "Backend offline" : "System online"}</b>
      Spleen model · Dice 0.90<br />3D UNet · runs on CPU</div>
  );
}

const NAV = [["about", "About", Info, "Pipeline, privacy and tech"], ["analyze", "Analyze", ScanLine, "Upload, run the model, explore in 3D"],
  ["studies", "Studies", FolderOpen, "Every scan you have uploaded"], ["results", "Results", ClipboardList, "Findings from finished analyses"],
  ["overview", "Dashboard", LayoutDashboard, "Your analysis activity"]];

export default function Dashboard({ onHome }) {
  const [tab, setTab] = useState("about");
  const [picked, setPicked] = useState(null);
  const [ok, setOk] = useState(() => sessionStorage.getItem("vs_ok") === "1");
  const cur = NAV.find((n) => n[0] === tab);
  if (!ok) return <Disclaimer onAccept={() => { sessionStorage.setItem("vs_ok", "1"); setOk(true); }} />;
  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><div className="lb">VS</div><span className="logo-t">VoxelScope</span></div>
        {NAV.map(([k, label, I]) => (<button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}><I size={18} />{label}</button>))}
        <button className="tab back" onClick={onHome}><ArrowLeft size={18} />Back</button>
        <SideStatus />
      </aside>
      <main className="main">
        <div className="top">
          <div><h2>{cur[1]}</h2><small>{cur[3]} · {new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}</small></div>
          <span className="disc">Not for diagnosis</span>
        </div>
        {tab === "overview" && <Overview go={setTab} />}
        {tab === "overview" && <Extra />}
        {tab === "analyze" && <Analyze key={picked} initial={picked} />}
        {tab === "studies" && <Studies open={(id) => { setPicked(id); setTab("analyze"); }} />}
        {tab === "results" && <Results />}
        {tab === "about" && <About />}
      </main>
    </div>
  );
}