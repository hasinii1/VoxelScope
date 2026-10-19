import { useEffect, useRef, useState } from "react";
import { Niivue } from "@niivue/niivue";
import { ArrowLeft } from "lucide-react";

// Fill these from your own run of spleen_8
const VOLUME_ML = 452.9;
const SECONDS = 14.54;
const PRESETS = { "Soft tissue": [-160, 240], Bone: [-200, 1500], Lung: [-1350, 150], Wide: [-1000, 1000] };

export default function Demo({ onBack }) {
  const cv = useRef(null), nv = useRef(null);
  const [op, setOp] = useState(0.5), [win, setWin] = useState("");
  useEffect(() => {
    const n = new Niivue({ backColor: [0, 0, 0, 1] });
    nv.current = n;
    n.attachToCanvas(cv.current);
    n.loadVolumes([{ url: "/demo/scan.nii.gz", name: "scan.nii.gz" }, { url: "/demo/mask.nii.gz", name: "mask.nii.gz", colormap: "red", opacity: 0.5 }]);
  }, []);
  const setWindow = (k) => { const v = nv.current.volumes[0]; [v.cal_min, v.cal_max] = PRESETS[k]; nv.current.updateGLVolume(); setWin(k); };
  const setOpacity = (v) => { setOp(v); if (nv.current.volumes.length > 1) nv.current.setOpacity(1, v); };
  return (
    <div className="main" style={{ maxWidth: 1300, margin: "0 auto" }}>
      <div className="top"><div><h2>Pre-computed example</h2><small>Spleen segmentation on one validation scan (MSD Task09)</small></div>
        <button className="btn btn-w btn-s" onClick={onBack}><ArrowLeft size={16} /> Back</button></div>
      <div className="kpis">
        <div className="kpi"><small>Spleen volume</small><b>{VOLUME_ML} ml</b><em>Segmented</em></div>
        <div className="kpi"><small>Model validation Dice</small><b>0.90</b><em>9 held-out scans</em></div>
        <div className="kpi"><small>Inference time</small><b>{SECONDS} s</b><em>CPU</em></div>
      </div>
      <div className="ws">
        <div><div className="vh"><span>Multi-planar reconstruction</span><span>Static demo</span></div><div className="vw"><canvas ref={cv} /></div></div>
        <div>
          <div className="panel"><h3>CT window</h3>
            <div className="pre">{Object.keys(PRESETS).map((k) => <button key={k} className={win === k ? "on" : ""} onClick={() => setWindow(k)}>{k}</button>)}</div>
            <h3>Mask opacity: {op}</h3>
            <input type="range" min="0" max="1" step="0.05" value={op} style={{ width: "100%" }} onChange={(e) => setOpacity(Number(e.target.value))} />
          </div>
          <div className="panel"><p className="empty">This page shows a stored result. It cannot analyse new scans. To run the live app, see the README (docker compose up).<br /><br /><b>Educational use only. Not for diagnosis.</b> Scan: Medical Segmentation Decathlon, CC BY-SA 4.0.</p></div>
        </div>
      </div>
    </div>
  );
}