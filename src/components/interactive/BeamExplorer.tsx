import { useEffect, useRef, useState } from 'react';

// Reuse the documented chart palette (including its light/dark scopes).
import './OptimizerLab.css';
import './BeamExplorer.css';

interface Candidate {
  id: number;
  b_mm: number;
  h_mm: number;
  predicted_deflection_mm: number;
  truth_deflection_mm: number;
  mass_kg: number;
  feasible: boolean;
  relative_error_pct: number;
}

interface GridData {
  rows: Candidate[];
  baseline_id: number;
  selected_id: number;
  color_scale: { min: number; max: number };
  physics: { mass_limit_kg: number };
}

const COLUMNS = ['id', 'b_mm', 'h_mm', 'predicted_deflection_mm',
  'truth_deflection_mm', 'mass_kg', 'feasible', 'relative_error_pct'] as const;
const SOURCE = '/data/beam-surrogate/explorer.json';
const FALLBACK = '/images/2026-09-21-beam-surrogate/design-space.png';
const PLOT = { x: 51, y: 26, size: 344 };
const N = 61;

function decode(raw: unknown): GridData {
  const data = raw as { columns: string[]; rows: (number | boolean)[][];
    axis_mm: number[]; baseline_id: number; selected_id: number;
    color_scale: GridData['color_scale']; physics: GridData['physics'] };
  if (!Array.isArray(data.rows) || data.rows.length !== N*N ||
      data.columns?.join() !== COLUMNS.join() ||
      data.axis_mm?.some((v, i) => v !== 10+i*.5) || data.axis_mm?.length !== N) {
    throw new Error('Invalid beam grid');
  }
  const rows = data.rows.map((values, index) => {
    if (values.length !== COLUMNS.length || values[0] !== index ||
        values.some((v, i) => i === 6 ? typeof v !== 'boolean' : typeof v !== 'number' || !Number.isFinite(v))) {
      throw new Error('Invalid beam candidate');
    }
    return Object.fromEntries(COLUMNS.map((key, i) => [key, values[i]])) as unknown as Candidate;
  });
  if (!rows[data.baseline_id] || !rows[data.selected_id] || !(data.color_scale.min > 0) ||
      !(data.color_scale.max > data.color_scale.min)) throw new Error('Invalid beam metadata');
  return { ...data, rows };
}

function xy(row: Candidate): [number, number] {
  return [PLOT.x + ((row.b_mm-10)/.5+.5)/N*PLOT.size,
    PLOT.y + (N-.5-(row.h_mm-10)/.5)/N*PLOT.size];
}

function interpolateColor(stops: string[], t: number): string {
  const level = Math.max(0, Math.min(1, t))*(stops.length-1);
  const i = Math.min(stops.length-2, Math.floor(level));
  const rgb = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset+2), 16));
  const a = rgb(stops[i]), b = rgb(stops[i+1]);
  return `rgb(${a.map((v, c) => Math.round(v+(b[c]-v)*(level-i))).join(',')})`;
}

function PerformanceMap({ data, selected, onSelect }: {
  data: GridData; selected: number; onSelect: (id: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const background = useRef<HTMLCanvasElement | null>(null);
  const colors = useRef({ ink: '', surface: '', baseline: '', best: '' });
  const [themeVersion, setThemeVersion] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeVersion(v => v+1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setThemeVersion(v => v+1);
    media.addEventListener('change', update);
    return () => { observer.disconnect(); media.removeEventListener('change', update); };
  }, []);

  useEffect(() => {
    if (!canvas.current) return;
    const style = getComputedStyle(canvas.current);
    const css = (name: string) => style.getPropertyValue(name).trim();
    const field = Array.from({ length: 7 }, (_, i) => css(`--field-${i}`));
    colors.current = { ink: css('--viz-ink'), surface: css('--viz-surface'),
      baseline: css('--series-1'), best: css('--series-2') };
    const bg = document.createElement('canvas');
    bg.width = 840; bg.height = 900;
    const pen = bg.getContext('2d');
    if (!pen) return;
    pen.scale(2, 2);
    pen.fillStyle = colors.current.surface;
    pen.fillRect(0, 0, 420, 450);
    const cell = PLOT.size/N;
    const minLog = Math.log(data.color_scale.min);
    const range = Math.log(data.color_scale.max)-minLog;
    data.rows.forEach(row => {
      const [x, y] = xy(row);
      pen.fillStyle = interpolateColor(field, (Math.log(row.predicted_deflection_mm)-minLog)/range);
      pen.fillRect(x-cell/2, y-cell/2, cell+.2, cell+.2);
      if (!row.feasible) {
        pen.save(); pen.globalAlpha = .45;
        pen.strokeStyle = colors.current.ink; pen.lineWidth = .6;
        pen.beginPath(); pen.moveTo(x-cell/2, y+cell/2); pen.lineTo(x+cell/2, y-cell/2); pen.stroke();
        pen.restore();
      }
    });
    pen.fillStyle = colors.current.ink;
    pen.font = '13px system-ui, sans-serif'; pen.textAlign = 'center';
    [10, 20, 30, 40].forEach(value => {
      const [x, y] = xy({ b_mm: value, h_mm: value } as Candidate);
      pen.fillText(String(value), x, 389); pen.fillText(String(value), 34, y+4);
    });
    pen.fillText('폭 b (mm)', 225, 410);
    pen.save(); pen.translate(14, 195); pen.rotate(-Math.PI/2);
    pen.fillText('높이 h (mm)', 0, 0); pen.restore();
    for (let i = 0; i < 256; i++) {
      pen.fillStyle = interpolateColor(field, i/255); pen.fillRect(90+i*1.08, 425, 1.2, 8);
    }
    pen.fillStyle = colors.current.ink; pen.font = '11px system-ui, sans-serif';
    pen.textAlign = 'left'; pen.fillText(`${data.color_scale.min.toFixed(3)} mm · 좋음`, 90, 446);
    pen.textAlign = 'right'; pen.fillText(`${data.color_scale.max.toFixed(2)} mm`, 366, 446);
    background.current = bg;
  }, [data, themeVersion]);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || !background.current) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(background.current, 0, 0); ctx.scale(2, 2);
    const marker = (id: number, text: string, color: string) => {
      const [x, y] = xy(data.rows[id]);
      ctx.font = 'bold 21px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4; ctx.strokeStyle = colors.current.surface;
      ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
    };
    marker(data.baseline_id, '●', colors.current.baseline);
    marker(data.selected_id, '★', colors.current.best);
    const [x, y] = xy(data.rows[selected]);
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI*2);
    ctx.strokeStyle = colors.current.surface; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = colors.current.ink; ctx.lineWidth = 1.5; ctx.stroke();
    if (selected !== data.baseline_id && selected !== data.selected_id) marker(selected, '+', colors.current.ink);
  }, [data, selected, themeVersion]);

  return <canvas ref={canvas} className="beam-map" width={840} height={900} role="img"
    aria-label="가로축 폭 b, 세로축 높이 h, 예측 처짐의 설계공간. 같은 선택을 아래 슬라이더로도 할 수 있습니다."
    onClick={event => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX-rect.left)/rect.width*420, y = (event.clientY-rect.top)/rect.height*450;
      if (x<PLOT.x || x>PLOT.x+PLOT.size || y<PLOT.y || y>PLOT.y+PLOT.size) return;
      const ix = Math.min(N-1, Math.floor((x-PLOT.x)/PLOT.size*N));
      const iy = Math.max(0, N-1-Math.floor((y-PLOT.y)/PLOT.size*N));
      onSelect(iy*N+ix);
    }} />;
}

function BeamShape({ b, h }: { b: number; h: number }) {
  const project = ([x, y, z]: number[]) => [40+.64*x+.45*y, 100+.28*y-.64*z];
  const vertices = [[0,0,0],[500,0,0],[500,b,0],[0,b,0],[0,0,h],[500,0,h],[500,b,h],[0,b,h]];
  const tip = project([500,b/2,h]);
  return <svg className="beam-shape" viewBox="0 0 420 310" role="img" aria-labelledby="beam-shape-title">
    <title id="beam-shape-title">{`폭 ${b} mm, 높이 ${h} mm, 길이 500 mm인 변형 전 외팔보`}</title>
    <rect x={28} y={61} width={12} height={58} fill="var(--viz-axis)" />
    {[[0,1,5,4],[4,5,6,7],[1,2,6,5]].map((face, i) => <polygon key={i}
      points={face.map(v => project(vertices[v]).join(',')).join(' ')}
      fill="var(--series-2)" fillOpacity={[.85,.55,1][i]} stroke="var(--viz-ink)" strokeWidth={.8} />)}
    <g fill="var(--viz-ink-muted)" fontSize={13}>
      <text x={28} y={140}>고정단</text><text x={148} y={140}>길이 L = 500 mm</text>
    </g>
    <g stroke="var(--viz-ink)" strokeWidth={2} fill="none">
      <path d={`M ${tip[0]} 21 V ${tip[1]-4} M ${tip[0]-4} ${tip[1]-11} L ${tip[0]} ${tip[1]-4} L ${tip[0]+4} ${tip[1]-11}`} />
    </g>
    <text x={260} y={16} fontSize={13} fill="var(--viz-ink)">하중 F = 10 N ↓</text>
    <text x={25} y={178} fontSize={14} fill="var(--viz-ink)">단면 확대 · 같은 축척</text>
    <rect x={145-b*1.2} y={285-h*2.4} width={b*2.4} height={h*2.4} fill="var(--series-2)" fillOpacity={.7} />
    <rect x={121} y={237} width={48} height={48} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeDasharray="5 3" />
    <path d="M 83 285 H 207" stroke="var(--viz-axis)" />
    <g fill="var(--viz-ink)" fontSize={15}>
      <text x={228} y={224}>b = {b.toFixed(1)} mm</text><text x={228} y={250}>h = {h.toFixed(1)} mm</text>
    </g>
    <text x={88} y={305} fill="var(--viz-ink-muted)" fontSize={12}>점선: 기준 20 × 20</text>
  </svg>;
}

export default function BeamExplorer() {
  const [data, setData] = useState<GridData | null>(null);
  const [selected, setSelected] = useState(1240);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(SOURCE, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error(`Data HTTP ${response.status}`);
      return response.json();
    }).then(raw => {
      const parsed = decode(raw); setSelected(parsed.baseline_id); setData(parsed);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);
  const row = data?.rows[selected];
  return <div className="lab beam-explorer" id="beam-explorer" data-selected-id={row?.id}>
    <p className="beam-intro"><strong>3,721개 형상의 성능 지도</strong><br />처짐이 작을수록 좋습니다. 지도 또는 슬라이더로 형상을 선택하세요.</p>
    {!data || !row ? <div className="beam-fallback">
      <img src={FALLBACK} width={1230} height={1122} alt="예측 처짐의 설계공간. 원은 기준 형상, 별은 유망 후보, 빗금은 질량 제한 초과 영역입니다." />
      <p className="beam-status" role="status">{failed ? '인터랙티브 데이터를 불러오지 못해 정적 지도를 표시합니다. 본문의 그림과 CSV에서 결과를 확인할 수 있습니다.' : '정적 지도를 표시합니다. JavaScript와 데이터 로딩이 완료되면 직접 조작할 수 있습니다.'}</p>
    </div> : <div className="beam-live">
      <div className="beam-panels">
        <div>
          <PerformanceMap data={data} selected={selected} onSelect={setSelected} />
          <p className="beam-key"><span className="beam-base-dot">●</span> 기준 형상 · <span className="beam-best-dot">★</span> 유망 후보 · 테두리: 현재 선택<br />빗금: 질량 제한 초과 · 색: 예측 처짐(mm), 로그 척도</p>
        </div>
        <div className="beam-geometry">
          <BeamShape b={row.b_mm} h={row.h_mm} />
          <p className="beam-note">3D 형상은 변형 전 모습입니다. 보의 길이와 시점은 고정하고, 아래 단면도는 모든 선택에 같은 축척을 사용합니다. 점선은 기준 단면입니다.</p>
          <dl className="beam-values" aria-live="polite" aria-atomic="true">
            <div><dt>예측 처짐</dt><dd data-value="prediction">{row.predicted_deflection_mm.toFixed(4)} mm</dd></div>
            <div><dt>해석식 정답 처짐</dt><dd data-value="truth">{row.truth_deflection_mm.toFixed(4)} mm</dd></div>
            <div><dt>상대오차</dt><dd data-value="error">{row.relative_error_pct.toFixed(3)} %</dd></div>
            <div><dt>질량 / 제한</dt><dd data-value="mass">{row.mass_kg.toFixed(4)} / {data.physics.mass_limit_kg.toFixed(3)} kg</dd></div>
          </dl>
          <p className="beam-constraint" data-feasible={row.feasible}>{row.feasible ? '✓ 질량 제한 충족' : '× 질량 제한 초과'}</p>
        </div>
      </div>
      <div className="beam-controls">
        <label htmlFor="beam-width">폭 b <output id="beam-width-value" htmlFor="beam-width">{row.b_mm.toFixed(1)} mm</output></label>
        <input id="beam-width" type="range" min={10} max={40} step={.5} value={row.b_mm}
          aria-valuetext={`${row.b_mm.toFixed(1)} 밀리미터`} aria-describedby="beam-sampling"
          onChange={event => setSelected(Math.round((row.h_mm-10)/.5)*N + Math.round((Number(event.target.value)-10)/.5))} />
        <label htmlFor="beam-height">높이 h <output id="beam-height-value" htmlFor="beam-height">{row.h_mm.toFixed(1)} mm</output></label>
        <input id="beam-height" type="range" min={10} max={40} step={.5} value={row.h_mm}
          aria-valuetext={`${row.h_mm.toFixed(1)} 밀리미터`} aria-describedby="beam-sampling"
          onChange={event => setSelected(Math.round((Number(event.target.value)-10)/.5)*N + Math.round((row.b_mm-10)/.5))} />
        <div className="beam-buttons">
          <button type="button" data-select="baseline" onClick={() => setSelected(data.baseline_id)}>기준 20 × 20</button>
          <button type="button" data-select="best" onClick={() => setSelected(data.selected_id)}>유망 후보 10 × 40</button>
          <button type="button" data-select="wide" onClick={() => setSelected(N-1)}>같은 질량 40 × 10</button>
        </div>
      </div>
      <p id="beam-sampling" className="beam-note">0.5 mm 간격의 저장된 후보 중 가장 가까운 점을 선택합니다. 보간이나 브라우저 내 모델 추론은 하지 않습니다. 제약은 해석식 질량으로 판정합니다.</p>
    </div>}
  </div>;
}
