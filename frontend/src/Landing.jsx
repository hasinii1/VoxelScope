import { ScanLine, ArrowRight, ShieldCheck, FileText, Cpu, Activity, Gauge, Check, Layers, Brain } from "lucide-react";

const pipeline = [
  ["Upload scan", "DICOM zip or NIfTI"], ["Preprocess", "Resample and normalise"], ["Segment", "3D UNet, sliding window"],
  ["Measure", "Volume and 3D boxes"], ["Explore", "Axial, coronal, sagittal, 3D"],
];

export default function Landing({ onStart }) {
  return (
    <div className="land">
      <div className="dk">
        <header className="nav">
          <div className="logo"><div className="lb">VS</div><span className="logo-t">VoxelScope</span></div>
          <nav className="nl"><a href="#modules">Model</a><a href="#built">Built for AI research</a></nav>
          <button className="btn btn-p btn-s" onClick={onStart}>Launch dashboard</button>
        </header>
        <section className="hero">
          <div>
            <span className="tag"><Activity size={15} /> Medical image analysis</span>
            <h1>Automated CT segmentation of the <span>spleen.</span></h1>
            <p>Upload an abdominal CT series, run a 3D neural network, and review the mask, measured volume and detection box in a multi-planar browser viewer.</p>
            <div className="cta">
              <button className="btn btn-p" onClick={onStart}>Launch analysis dashboard <ArrowRight size={18} /></button>
              <a className="btn btn-w" href="#modules">Explore the model</a>
            </div>
            <div className="trust">
              <span><ShieldCheck size={17} /> Headers removed</span><span><FileText size={17} /> DICOM and NIfTI</span><span><Cpu size={17} /> GPU-ready</span>
            </div>
          </div>
          <div className="pipe">
            <div className="pipe-h"><span>Analysis pipeline</span><b>Spleen model</b></div>
            {pipeline.map(([t, d], i) => (
              <div className="pipe-r" key={t}><i>{i + 1}</i><div><b>{t}</b><small>{d}</small></div><Check size={18} /></div>
            ))}
            <div className="pipe-f"><div><small>Validation Dice</small><b>0.90</b></div><div><small>Per scan, laptop CPU</small><b>15 to 35 s</b></div></div>
          </div>
        </section>
      </div>

      <section className="sec" id="modules">
        <h2>Spleen segmentation module</h2>
        <p className="sub">One model trained on a public Medical Segmentation Decathlon task and checked against expert outlines.</p>
        <div className="mods">
          <div className="mod"><div className="ic"><Activity size={22} /></div><span className="badge b-ok" style={{ marginLeft: 10 }}>Ready</span>
            <h3>Spleen module</h3><p>Segments the spleen and reports its volume in millilitres with a 3D bounding box.</p>
            <ul><li><Check size={16} />MSD Task09 Spleen, 41 CT scans</li><li><Check size={16} />Validation Dice 0.90</li><li><Check size={16} />3D UNet with sliding-window inference</li></ul></div>
          <div className="mod"><div className="ic"><Gauge size={22} /></div><span className="badge b-ok" style={{ marginLeft: 10 }}>Checked</span>
            <h3>Accuracy check</h3><p>On one validation scan the expert outline measured 501.5 ml and an earlier model version measured 452.9 ml, about 10% smaller.</p>
            <ul><li><Check size={16} />Dice scored on 9 held-out scans</li><li><Check size={16} />Volume compared with the expert outline</li><li><Check size={16} />Small training set, so some error is expected</li></ul></div>
        </div>
      </section>

      <section className="sec" id="built" style={{ paddingTop: 0 }}>
        <h2>Engineered for medical AI development</h2>
        <p className="sub">Standard formats, a reproducible pipeline and a viewer that runs in any browser.</p>
        <div className="dev">
          <div className="ft"><div className="ic"><FileText size={22} /></div><h3>Clinical formats</h3><p>Reads DICOM series and NIfTI volumes, then stores one clean NIfTI per study.</p></div>
          <div className="ft"><div className="ic"><Brain size={22} /></div><h3>MONAI and PyTorch</h3><p>Resampling, intensity scaling and sliding-window inference built for medical images.</p></div>
          <div className="ft"><div className="ic"><Layers size={22} /></div><h3>Multi-planar viewer</h3><p>Axial, coronal, sagittal and 3D views with adjustable mask opacity.</p></div>
        </div>
      </section>

      <div className="band"><h2>Try it on a CT scan</h2><p>Upload a scan, run the model and inspect the mask in 3D.</p>
        <button className="btn" onClick={onStart}>Open dashboard <ArrowRight size={18} /></button></div>
      <footer className="foot"><b>Educational use only. Not a medical device. Not for diagnosis.</b><br />Data: Medical Segmentation Decathlon (CC BY-SA 4.0).</footer>
    </div>
  );
}