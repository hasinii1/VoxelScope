import { useEffect, useRef, useState } from "react";
import { Niivue } from "@niivue/niivue";
import { API, get, sleep } from "./api.js";
import { Warn } from "./Guard.jsx";
import { UploadCloud, Play, Download, Trash2, FileText } from "lucide-react";

const PRESETS = { "Soft tissue": [-160, 240], Bone: [-200, 1500], Lung: [-1350, 150], Wide: [-1000, 1000] };

export default function Analyze({ initial }) {
  const cv = useRef(null), nv = useRef(null);
  const [studies, setStudies] = useState([]), [sel, setSel] = useState(null);
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [res, setRes] = useState(null), [jobId, setJobId] = useState(null);
  const [op, setOp] = useState(0.5), [show, setShow] = useState(true), [win, setWin] = useState("");
  const load = async () => setStudies(await get("/studies"));

  useEffect(() => {
    nv.current = new Niivue({ backColor: [0, 0, 0, 1] });
    nv.current.attachToCanvas(cv.current);
    load();
    if (initial) open(initial);
  }, []);
  useEffect(() => { const n = nv.current; if (n && n.volumes.length > 1) n.setOpacity(1, show ? op : 0); }, [op, show]);

  async function open(id) {
    setSel(id); setRes(null); setJobId(null); setWin(""); setMsg("");
    await nv.current.loadVolumes([{ url: `${API}/studies/${id}/volume`, name: "scan.nii.gz" }]);
  }
  function applyWindow(name) {
    const v = nv.current && nv.current.volumes[0];
    if (!v) return;
    [v.cal_min, v.cal_max] = PRESETS[name];
    nv.current.updateGLVolume();
    setWin(name);
  }
  async function upload(e) {
    const f = e.target.files[0]; if (!f) return;
    if (!/\.(nii|nii\.gz|zip)$/i.test(f.name)) { setMsg("Unsupported file. Use .nii, .nii.gz or a .zip of DICOM slices."); return; }
    if (f.size > 300 * 1024 * 1024) { setMsg("File is larger than 300 MB."); return; }
    setMsg("Uploading...");
    const form = new FormData(); form.append("file", f);
    const r = await fetch(`${API}/studies`, { method: "POST", body: form });
    if (!r.ok) { const er = await r.json().catch(() => ({})); setMsg("Upload failed: " + (er.detail || r.status)); return; }
    const s = await r.json(); await load(); await open(s.id); setMsg("Uploaded.");
  }
  async function run() {
    if (!sel || busy) return;
    setBusy(true); setRes(null); setJobId(null); setMsg("Starting analysis...");
    try {
      const r = await fetch(`${API}/studies/${sel}/analyze`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "spleen" }) });
      let job = await r.json();
      if (!r.ok) { setMsg("Error: " + (job.detail || r.status)); return; }
      while (job.status === "queued" || job.status === "running") { setMsg(`Job #${job.id}: ${job.status}...`); await sleep(1500); job = await get(`/jobs/${job.id}`); }
      if (job.status === "failed") { setMsg("Failed: " + job.error); return; }
      setRes(await get(`/jobs/${job.id}/result`)); setJobId(job.id);
      await nv.current.addVolumeFromUrl({ url: `${API}/jobs/${job.id}/mask`, name: "mask.nii.gz", colormap: "red", opacity: op });
      setMsg("Analysis complete.");
    } catch (e) { setMsg("Error: " + e.message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!sel || !window.confirm("Delete this scan, its results and masks? This cannot be undone.")) return;
    const r = await fetch(`${API}/studies/${sel}`, { method: "DELETE" });
    if (!r.ok) { setMsg("Delete failed."); return; }
    [...nv.current.volumes].forEach((v) => nv.current.removeVolume(v));
    setSel(null); setRes(null); setJobId(null); setWin(""); setMsg("Scan deleted."); load();
  }

  const cur = studies.find((s) => s.id === sel);
function downloadReport() {
  if (!res) return;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const rows = res.boxes.map((b, i) => `<tr><td>${i + 1}</td><td>${b.volume_ml} ml</td><td>[${b.min.join(", ")}]</td><td>[${b.max.join(", ")}]</td></tr>`).join("");
  const scan = cur ? `${esc(cur.filename)} (study #${cur.id}, ${cur.shape.join(" × ")} voxels)` : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>VoxelScope report</title>
<style>body{font-family:Arial,sans-serif;max-width:720px;margin:40px auto;color:#12263a;line-height:1.5}h1{margin-bottom:0}small{color:#64748b}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}.warn{background:#fef3c7;color:#92400e;padding:12px;border-radius:8px;margin-top:20px}</style></head><body>
<h1>VoxelScope analysis report</h1><small>${esc(new Date().toLocaleString())}</small>
<h3>Scan</h3><p>${scan}</p>
<h3>Result</h3><table>
<tr><th>Model</th><td>Spleen segmentation (3D UNet). Overall validation Dice 0.90, not specific to this scan.</td></tr>
<tr><th>Spleen volume</th><td>${res.volume_ml} ml</td></tr>
<tr><th>Regions found</th><td>${res.num_findings}</td></tr>
<tr><th>Inference</th><td>${res.inference_seconds} s on ${esc(res.device.toUpperCase())}</td></tr></table>
<h3>Regions</h3><table><tr><th>#</th><th>Volume</th><th>Box min (voxels)</th><th>Box max (voxels)</th></tr>${rows}</table>
<div class="warn"><b>Educational use only.</b> This output is not a diagnosis and must not be used for medical decisions. AI output can be wrong.</div>
</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    a.download = `voxelscope-report-${cur ? cur.id : "scan"}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <>
      <div className="wsh">
        <div><h3>Analysis workspace</h3><small>{cur ? `Active scan: #${cur.id} ${cur.filename}` : "No scan selected"}</small></div>
        <div className="acts">
          <label className="btn btn-w btn-s up"><UploadCloud size={16} /> Import scan<input type="file" accept=".gz,.nii,.zip" onChange={upload} /></label>
          <a className={`btn btn-w btn-s ${jobId ? "" : "off"}`} href={jobId ? `${API}/jobs/${jobId}/mask` : undefined}><Download size={16} /> Download mask</a>
          <button className="btn btn-w btn-s" disabled={!res} onClick={downloadReport}><FileText size={16} /> Download report</button>
          <button className="btn btn-d btn-s" disabled={!sel} onClick={remove}><Trash2 size={16} /> Delete scan</button>
          <button className="btn btn-p btn-s" disabled={!sel || busy} onClick={run}><Play size={16} />{busy ? "Running..." : "Run spleen analysis"}</button>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><small>Spleen volume</small><b>{res ? `${res.volume_ml} ml` : "-"}</b><em>{res ? "Segmented" : "Run analysis"}</em></div>
        <div className="kpi"><small>Active model</small><b>Spleen</b><em>3D UNet</em></div>
        <div className="kpi"><small>Detected regions</small><b>{res ? res.num_findings : "-"}</b><em>3D boxes</em></div>
        <div className="kpi"><small>Inference time</small><b>{res ? `${res.inference_seconds} s` : "-"}</b><em>{res ? res.device.toUpperCase() : "3D UNet"}</em></div>
      </div>
      <div className="ws">
        <div>
          <div className="vh"><span>Multi-planar reconstruction</span><span>{msg}</span></div>
          <div className="vw"><canvas ref={cv} /></div>
        </div>
        <div>
          <div className="panel lay"><h3>Scans</h3>
            <select className="field" value={sel || ""} onChange={(e) => open(Number(e.target.value))}>
              <option value="" disabled>Choose a scan</option>
              {studies.map((s) => <option key={s.id} value={s.id}>#{s.id} {s.filename}</option>)}
            </select>
            <h3>CT window</h3>
            <div className="pre">{Object.keys(PRESETS).map((k) => <button key={k} className={win === k ? "on" : ""} onClick={() => applyWindow(k)}>{k}</button>)}</div>
            <h3>Segmentation layers</h3>
            <label><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Spleen mask</label>
            <div style={{ fontSize: 14 }}>Opacity: {op}<input type="range" min="0" max="1" step="0.05" value={op} style={{ width: "100%" }} onChange={(e) => setOp(Number(e.target.value))} /></div>
          </div>
          <div className="panel"><h3>Findings</h3>
            {!res && <p className="empty">Run an analysis to see findings.</p>}
            {res && res.boxes.map((b, i) => (
              <div className="fi" key={i}><b>Region {i + 1}: {b.volume_ml} ml</b>Box from [{b.min.join(", ")}] to [{b.max.join(", ")}] voxels.</div>
            ))}
            {res && <Warn res={res} />}
            <p className="empty">Educational output. Not a diagnosis.</p>
          </div>
        </div>
      </div>
    </>
  );
}
