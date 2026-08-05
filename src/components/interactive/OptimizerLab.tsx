import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import './OptimizerLab.css';

/* ==========================================================================
   Loss surfaces
   Each surface ships an analytic gradient — finite differences would blur the
   very anisotropy these examples exist to show.
   ========================================================================== */

interface Surface {
  id: string;
  name: { ko: string; en: string };
  /** Explains what the surface is *for*, shown under the picker. */
  blurb: { ko: string; en: string };
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  /** Symmetric half-width of the plotted domain. */
  extent: number;
  start: [number, number];
  /** Global minima, marked on the plot. */
  minima: [number, number][];
  /** Learning rate that makes plain SGD behave, as the slider's default. */
  defaultLr: number;
}

const SURFACES: Surface[] = [
  {
    id: 'ravine',
    name: { ko: '좁은 골짜기', en: 'Ill-conditioned ravine' },
    blurb: {
      ko: '한 방향의 곡률이 다른 방향보다 24배 큽니다. SGD가 왜 지그재그로 튀는지 보여줍니다.',
      en: 'One direction is 24× more curved than the other — the classic reason plain SGD zig-zags.',
    },
    f: (x, y) => 0.5 * (12 * x * x + 0.5 * y * y),
    grad: (x, y) => [12 * x, 0.5 * y],
    extent: 2.2,
    start: [-1.7, 1.9],
    minima: [[0, 0]],
    // Deliberately well inside the stability limit (2/a ≈ 0.167). Nearer the
    // limit, heavy-ball momentum rings so hard that its advantage over SGD
    // stops being legible — which is the whole point of this surface.
    defaultLr: 0.02,
  },
  {
    id: 'rosenbrock',
    name: { ko: 'Rosenbrock 바나나', en: 'Rosenbrock banana' },
    blurb: {
      ko: '곡선형 골짜기. 골짜기를 따라가는 것과 골짜기를 건너뛰지 않는 것 사이의 줄타기입니다.',
      en: 'A curved valley: following it and not overshooting it pull in opposite directions.',
    },
    f: (x, y) => (1 - x) ** 2 + 20 * (y - x * x) ** 2,
    grad: (x, y) => [-2 * (1 - x) - 80 * x * (y - x * x), 40 * (y - x * x)],
    extent: 2.2,
    start: [-1.6, 1.6],
    minima: [[1, 1]],
    defaultLr: 0.002,
  },
  {
    id: 'saddle',
    name: { ko: '안장점', en: 'Saddle point' },
    blurb: {
      ko: '원점은 최솟값이 아니라 안장점입니다. 기울기가 거의 0이라 SGD는 오래 머뭅니다.',
      en: 'The origin is a saddle, not a minimum. The gradient nearly vanishes, so SGD loiters.',
    },
    f: (x, y) => x * x - y * y + 0.25 * (x ** 4 + y ** 4),
    grad: (x, y) => [2 * x + x ** 3, -2 * y + y ** 3],
    extent: 2.2,
    start: [-0.04, 0.02],
    minima: [
      [0, Math.SQRT2],
      [0, -Math.SQRT2],
    ],
    defaultLr: 0.05,
  },
  {
    id: 'doublewell',
    name: { ko: '이중 우물', en: 'Double well' },
    blurb: {
      ko: '최솟값이 두 개. 어디서 출발하느냐가 어디에 도착하느냐를 결정합니다.',
      en: 'Two minima — where you start decides where you land. Click the plot to try.',
    },
    f: (x, y) => (x * x - 1) ** 2 + 0.5 * y * y,
    grad: (x, y) => [4 * x * (x * x - 1), y],
    extent: 2.2,
    start: [-0.15, 1.7],
    minima: [
      [-1, 0],
      [1, 0],
    ],
    defaultLr: 0.06,
  },
];

/* ==========================================================================
   Optimizers
   ========================================================================== */

type OptimizerId = 'sgd' | 'momentum' | 'adam';

interface OptimizerSpec {
  id: OptimizerId;
  label: string;
  /** Categorical slot from the validated palette; see OptimizerLab.css. */
  cssVar: string;
}

/* Slots 1–3 of the reference categorical palette. Validated with
   `validate_palette.js --pairs all` in both modes against this component's
   surface: worst all-pairs CVD ΔE 9.2 light / 9.4 dark, normal-vision 24.0 /
   20.9. Light-mode orange and aqua land under 3:1, so the relief channel is
   mandatory — hence the direct end-labels and the table view below. */
const OPTIMIZERS: OptimizerSpec[] = [
  { id: 'sgd', label: 'SGD', cssVar: '--series-1' },
  { id: 'momentum', label: 'Momentum', cssVar: '--series-2' },
  { id: 'adam', label: 'Adam', cssVar: '--series-3' },
];

interface Params {
  lr: number;
  momentum: number;
  steps: number;
}

interface Trajectory {
  id: OptimizerId;
  points: [number, number][];
  losses: number[];
  diverged: boolean;
}

const DIVERGENCE_RADIUS = 6;

function run(
  id: OptimizerId,
  surface: Surface,
  start: [number, number],
  { lr, momentum, steps }: Params,
): Trajectory {
  let [x, y] = start;
  const points: [number, number][] = [[x, y]];
  const losses: number[] = [surface.f(x, y)];

  // Momentum buffers; Adam reuses m and adds v.
  let mx = 0;
  let my = 0;
  let vx = 0;
  let vy = 0;
  const b1 = 0.9;
  const b2 = 0.999;
  const eps = 1e-8;

  for (let t = 1; t <= steps; t++) {
    const [gx, gy] = surface.grad(x, y);

    if (id === 'sgd') {
      x -= lr * gx;
      y -= lr * gy;
    } else if (id === 'momentum') {
      // Heavy ball: velocity accumulates, so consistent directions compound
      // while the oscillating ones cancel.
      mx = momentum * mx - lr * gx;
      my = momentum * my - lr * gy;
      x += mx;
      y += my;
    } else {
      mx = b1 * mx + (1 - b1) * gx;
      my = b1 * my + (1 - b1) * gy;
      vx = b2 * vx + (1 - b2) * gx * gx;
      vy = b2 * vy + (1 - b2) * gy * gy;
      const mhx = mx / (1 - b1 ** t);
      const mhy = my / (1 - b1 ** t);
      const vhx = vx / (1 - b2 ** t);
      const vhy = vy / (1 - b2 ** t);
      x -= (lr * mhx) / (Math.sqrt(vhx) + eps);
      y -= (lr * mhy) / (Math.sqrt(vhy) + eps);
    }

    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x, y) > DIVERGENCE_RADIUS) {
      return { id, points, losses, diverged: true };
    }

    points.push([x, y]);
    losses.push(surface.f(x, y));
  }

  return { id, points, losses, diverged: false };
}

/* ==========================================================================
   Palette plumbing
   Canvas cannot read CSS custom properties, so resolve them once per theme.
   ========================================================================== */

const FIELD_STEPS = 7;

interface Palette {
  field: [number, number, number][];
  contourDark: boolean;
  series: Record<OptimizerId, string>;
  surface: string;
}

function parseRgb(value: string): [number, number, number] {
  const hex = value.trim();
  if (hex.startsWith('#')) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const nums = hex.match(/[\d.]+/g);
  if (nums && nums.length >= 3) {
    return [Number(nums[0]), Number(nums[1]), Number(nums[2])];
  }
  return [128, 128, 128];
}

function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  const field: [number, number, number][] = [];
  for (let i = 0; i < FIELD_STEPS; i++) {
    field.push(parseRgb(cs.getPropertyValue(`--field-${i}`)));
  }
  return {
    field,
    // In dark mode the ramp runs dark -> light, so contours must lighten.
    contourDark: cs.getPropertyValue('--field-polarity').trim() !== 'dark',
    series: {
      sgd: cs.getPropertyValue('--series-1').trim(),
      momentum: cs.getPropertyValue('--series-2').trim(),
      adam: cs.getPropertyValue('--series-3').trim(),
    },
    surface: cs.getPropertyValue('--viz-surface').trim(),
  };
}

/** Watches the theme stamp on <html> so the canvas can be repainted. */
function useThemeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setVersion((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return version;
}

/* ==========================================================================
   Field rendering
   ========================================================================== */

const PLOT = 560; // internal canvas + SVG viewBox size, in px
const BANDS = 11;
/** Fraction of the ramp the field is allowed to use; see drawField. */
const RAMP_CAP = 0.86;

function drawField(canvas: HTMLCanvasElement, surface: Surface, palette: Palette) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { extent } = surface;
  const image = ctx.createImageData(PLOT, PLOT);
  const data = image.data;

  // Compress the dynamic range: these surfaces span several decades, and a
  // linear map would flatten everything except the steepest corner.
  const level = new Float32Array(PLOT * PLOT);
  let lo = Infinity;
  let hi = -Infinity;
  for (let py = 0; py < PLOT; py++) {
    const y = extent - (2 * extent * py) / (PLOT - 1);
    for (let px = 0; px < PLOT; px++) {
      const x = -extent + (2 * extent * px) / (PLOT - 1);
      const v = Math.log1p(Math.max(0, surface.f(x, y)));
      level[py * PLOT + px] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }

  const span = hi - lo || 1;
  const band = new Uint8Array(PLOT * PLOT);
  for (let i = 0; i < level.length; i++) {
    band[i] = Math.min(BANDS - 1, Math.floor((((level[i] ?? lo) - lo) / span) * BANDS));
  }

  const ramp = palette.field;
  for (let py = 0; py < PLOT; py++) {
    for (let px = 0; px < PLOT; px++) {
      const i = py * PLOT + px;
      // Stop short of the ramp's last step (RAMP_CAP) and bend the curve
      // slightly: at full range the high-loss majority of the domain saturates
      // to the darkest step and swallows both the contours and the paths.
      const norm = ((level[i] ?? lo) - lo) / span;
      const t = norm ** 1.15 * (FIELD_STEPS - 1) * RAMP_CAP;
      const k = Math.min(FIELD_STEPS - 2, Math.floor(t));
      const frac = t - k;
      const a = ramp[k] ?? [128, 128, 128];
      const b = ramp[k + 1] ?? a;

      let r = a[0] + (b[0] - a[0]) * frac;
      let g = a[1] + (b[1] - a[1]) * frac;
      let bl = a[2] + (b[2] - a[2]) * frac;

      // Contour = a band boundary. Detecting the edge gives crisp 1px lines,
      // where modulating lightness would only give soft rings.
      const here = band[i];
      const right = px + 1 < PLOT ? band[i + 1] : here;
      const down = py + 1 < PLOT ? band[i + PLOT] : here;
      if (here !== right || here !== down) {
        if (palette.contourDark) {
          r *= 0.76;
          g *= 0.76;
          bl *= 0.76;
        } else {
          r += (255 - r) * 0.22;
          g += (255 - g) * 0.22;
          bl += (255 - bl) * 0.22;
        }
      }

      const o = i * 4;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = bl;
      data[o + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
}

/* ==========================================================================
   Component
   ========================================================================== */

interface Props {
  locale?: 'ko' | 'en';
}

const COPY = {
  ko: {
    surface: '손실 표면',
    lr: '학습률',
    momentum: '모멘텀 계수',
    steps: '스텝 수',
    play: '재생',
    pause: '일시정지',
    replay: '다시 재생',
    reset: '초기화',
    hint: '표면을 클릭하면 출발점이 바뀝니다.',
    lossAxis: '손실 (로그 스케일)',
    stepAxis: '스텝',
    landscapeTitle: '손실 표면과 이동 경로',
    curveTitle: '스텝에 따른 손실',
    legendHint: '이름을 눌러 켜고 끌 수 있습니다',
    tableToggle: '표로 보기',
    optimizer: '옵티마이저',
    finalLoss: '최종 손실',
    bestLoss: '최저 손실',
    status: '상태',
    diverged: '발산',
    converged: '수렴',
    running: '진행',
    step: '스텝',
    scaleLow: '낮음',
    scaleHigh: '높음',
    minimum: '최솟값',
    startPoint: '출발점',
  },
  en: {
    surface: 'Loss surface',
    lr: 'Learning rate',
    momentum: 'Momentum',
    steps: 'Steps',
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    reset: 'Reset',
    hint: 'Click the surface to move the starting point.',
    lossAxis: 'Loss (log scale)',
    stepAxis: 'Step',
    landscapeTitle: 'Loss surface and optimizer paths',
    curveTitle: 'Loss per step',
    legendHint: 'Click a name to toggle it',
    tableToggle: 'View as table',
    optimizer: 'Optimizer',
    finalLoss: 'Final loss',
    bestLoss: 'Best loss',
    status: 'Status',
    diverged: 'Diverged',
    converged: 'Converged',
    running: 'Running',
    step: 'Step',
    scaleLow: 'Low',
    scaleHigh: 'High',
    minimum: 'Minimum',
    startPoint: 'Start',
  },
} as const;

/** Widened so either locale's table satisfies it. */
type Copy = { [K in keyof (typeof COPY)['ko']]: string };

export default function OptimizerLab({ locale = 'ko' }: Props) {
  const c = COPY[locale];

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeVersion = useThemeVersion();

  const [surfaceId, setSurfaceId] = useState(SURFACES[0]!.id);
  const surface = SURFACES.find((s) => s.id === surfaceId) ?? SURFACES[0]!;

  const [start, setStart] = useState<[number, number]>(surface.start);
  const [lr, setLr] = useState(surface.defaultLr);
  const [momentum, setMomentum] = useState(0.9);
  const [steps, setSteps] = useState(160);
  const [hidden, setHidden] = useState<Set<OptimizerId>>(new Set());
  const [playing, setPlaying] = useState(true);
  const [revealed, setRevealed] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [palette, setPalette] = useState<Palette | null>(null);

  const reduceMotion = useRef(false);
  useEffect(() => {
    reduceMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Switching surfaces resets everything that only made sense for the old one.
  useEffect(() => {
    setStart(surface.start);
    setLr(surface.defaultLr);
    setRevealed(0);
    setPlaying(true);
  }, [surfaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rootRef.current) setPalette(readPalette(rootRef.current));
  }, [themeVersion]);

  useEffect(() => {
    if (canvasRef.current && palette) drawField(canvasRef.current, surface, palette);
  }, [surface, palette]);

  const trajectories = useMemo(
    () => OPTIMIZERS.map((o) => run(o.id, surface, start, { lr, momentum, steps })),
    [surface, start, lr, momentum, steps],
  );

  const maxLen = Math.max(...trajectories.map((t) => t.points.length));

  // Re-running the optimizers restarts the reveal animation.
  useEffect(() => {
    setRevealed(reduceMotion.current ? maxLen : 0);
    setCursor(null);
  }, [trajectories, maxLen]);

  useEffect(() => {
    if (!playing || revealed >= maxLen || reduceMotion.current) return;
    let raf = 0;
    let last = performance.now();
    const perSecond = 90;
    const tick = (now: number) => {
      const advance = ((now - last) / 1000) * perSecond;
      if (advance >= 1) {
        last = now;
        setRevealed((r) => Math.min(maxLen, r + Math.max(1, Math.floor(advance))));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, revealed, maxLen]);

  const toDomain = useCallback(
    (px: number, py: number): [number, number] => [
      -surface.extent + (2 * surface.extent * px) / (PLOT - 1),
      surface.extent - (2 * surface.extent * py) / (PLOT - 1),
    ],
    [surface.extent],
  );

  const toPlot = useCallback(
    (x: number, y: number): [number, number] => [
      ((x + surface.extent) / (2 * surface.extent)) * (PLOT - 1),
      ((surface.extent - y) / (2 * surface.extent)) * (PLOT - 1),
    ],
    [surface.extent],
  );

  const handleSurfaceClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * (PLOT - 1);
    const py = ((event.clientY - rect.top) / rect.height) * (PLOT - 1);
    setStart(toDomain(px, py));
    setPlaying(true);
  };

  const visible = trajectories.filter((t) => !hidden.has(t.id));

  const toggle = (id: OptimizerId) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      // Never hide the last visible series — an empty chart is not a state
      // anyone asked for.
      else if (next.size < OPTIMIZERS.length - 1) next.add(id);
      return next;
    });

  const seriesColor = (id: OptimizerId) => palette?.series[id] ?? 'currentColor';

  return (
    <div className="lab" ref={rootRef}>
      <div className="lab__panels">
        {/* ---------------- Loss surface ---------------- */}
        <figure className="lab__panel">
          <figcaption className="lab__panel-title">{c.landscapeTitle}</figcaption>
          <div className="lab__plot">
            <canvas
              ref={canvasRef}
              width={PLOT}
              height={PLOT}
              className="lab__canvas"
              aria-hidden="true"
            />
            <svg
              viewBox={`0 0 ${PLOT} ${PLOT}`}
              className="lab__overlay"
              onClick={handleSurfaceClick}
              role="img"
              aria-label={`${c.landscapeTitle}. ${c.hint}`}
            >
              {surface.minima.map(([mx, my]) => {
                const [cx, cy] = toPlot(mx, my);
                return (
                  <g key={`${mx},${my}`} className="lab__min">
                    <path
                      d={`M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}M${cx + 7} ${cy - 7}L${cx - 7} ${cy + 7}`}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}

              {visible.map((traj) => {
                const shown = traj.points.slice(0, Math.max(2, revealed));
                if (shown.length < 2) return null;
                const d = shown
                  .map(([x, y], i) => {
                    const [px, py] = toPlot(x, y);
                    return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`;
                  })
                  .join('');
                return (
                  <g key={traj.id}>
                    {/* 2px surface ring on each side keeps the path legible
                        wherever it crosses a dark band. */}
                    <path className="lab__path-halo" d={d} vectorEffect="non-scaling-stroke" />
                    <path
                      className="lab__path"
                      d={d}
                      stroke={seriesColor(traj.id)}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                );
              })}

              {visible.map((traj) => {
                const idx = Math.min(traj.points.length - 1, Math.max(0, revealed - 1));
                const point = traj.points[idx];
                if (!point) return null;
                const [px, py] = toPlot(point[0], point[1]);
                return (
                  <circle
                    key={traj.id}
                    className="lab__head"
                    cx={px}
                    cy={py}
                    r={5.5}
                    fill={seriesColor(traj.id)}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}

              {(() => {
                const [px, py] = toPlot(start[0], start[1]);
                return (
                  <g className="lab__start">
                    <circle cx={px} cy={py} r={6} vectorEffect="non-scaling-stroke" />
                    <circle cx={px} cy={py} r={1.6} />
                  </g>
                );
              })()}
            </svg>
          </div>

          <div className="lab__scale" aria-hidden="true">
            <span>{c.scaleLow}</span>
            <span className="lab__scale-bar" />
            <span>{c.scaleHigh}</span>
          </div>
          <p className="lab__hint">
            <span className="lab__key lab__key--start" /> {c.startPoint}
            <span className="lab__key lab__key--min" /> {c.minimum}
            <span className="lab__hint-sep">·</span>
            {c.hint}
          </p>
        </figure>

        {/* ---------------- Loss curves ---------------- */}
        <figure className="lab__panel">
          <figcaption className="lab__panel-title">{c.curveTitle}</figcaption>
          <LossChart
            trajectories={visible}
            revealed={revealed}
            colorOf={seriesColor}
            cursor={cursor}
            onCursor={setCursor}
            labels={OPTIMIZERS}
            copy={c}
          />
        </figure>
      </div>

      {/* Legend is always present: identity never rests on color alone. */}
      <div className="lab__legend">
        {OPTIMIZERS.map((o) => {
          const off = hidden.has(o.id);
          return (
            <button
              type="button"
              key={o.id}
              className={`lab__legend-item${off ? ' is-off' : ''}`}
              onClick={() => toggle(o.id)}
              aria-pressed={!off}
            >
              <span className="lab__swatch" style={{ background: seriesColor(o.id) }} />
              {o.label}
            </button>
          );
        })}
        <span className="lab__legend-hint">{c.legendHint}</span>
      </div>

      {/* ---------------- Controls ---------------- */}
      <div className="ctrl-grid">
        <label className="ctrl">
          <span className="ctrl__label">{c.surface}</span>
          <select value={surfaceId} onChange={(e) => setSurfaceId(e.target.value)}>
            {SURFACES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name[locale]}
              </option>
            ))}
          </select>
        </label>

        <label className="ctrl">
          <span className="ctrl__label">
            {c.lr}
            <span className="ctrl__value">{lr < 0.01 ? lr.toFixed(4) : lr.toFixed(3)}</span>
          </span>
          {/* Log-spaced: the interesting range spans four decades. */}
          <input
            type="range"
            min={-4}
            max={0}
            step={0.02}
            value={Math.log10(lr)}
            onChange={(e) => setLr(10 ** Number(e.target.value))}
          />
        </label>

        <label className="ctrl">
          <span className="ctrl__label">
            {c.momentum}
            <span className="ctrl__value">{momentum.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0}
            max={0.99}
            step={0.01}
            value={momentum}
            onChange={(e) => setMomentum(Number(e.target.value))}
          />
        </label>

        <label className="ctrl">
          <span className="ctrl__label">
            {c.steps}
            <span className="ctrl__value">{steps}</span>
          </span>
          <input
            type="range"
            min={20}
            max={400}
            step={10}
            value={steps}
            onChange={(e) => setSteps(Number(e.target.value))}
          />
        </label>

        <div className="ctrl btn-row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              if (revealed >= maxLen) setRevealed(0);
              setPlaying((p) => (revealed >= maxLen ? true : !p));
            }}
          >
            {revealed >= maxLen ? c.replay : playing ? c.pause : c.play}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setStart(surface.start);
              setLr(surface.defaultLr);
              setMomentum(0.9);
              setSteps(160);
              setHidden(new Set());
              setPlaying(true);
            }}
          >
            {c.reset}
          </button>
        </div>
      </div>

      {/* Relief channel for the sub-3:1 light-mode series, and the table-view
          twin every chart owes its readers. */}
      <details className="lab__table">
        <summary>{c.tableToggle}</summary>
        <div className="lab__table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">{c.optimizer}</th>
                <th scope="col">{c.finalLoss}</th>
                <th scope="col">{c.bestLoss}</th>
                <th scope="col">{c.status}</th>
              </tr>
            </thead>
            <tbody>
              {trajectories.map((traj) => {
                const spec = OPTIMIZERS.find((o) => o.id === traj.id)!;
                const shownLosses = traj.losses.slice(0, Math.max(1, revealed));
                const final = shownLosses[shownLosses.length - 1] ?? NaN;
                const best = Math.min(...shownLosses);
                return (
                  <tr key={traj.id}>
                    <th scope="row">
                      <span
                        className="lab__swatch"
                        style={{ background: seriesColor(traj.id) }}
                        aria-hidden="true"
                      />
                      {spec.label}
                    </th>
                    <td>{formatLoss(final)}</td>
                    <td>{formatLoss(best)}</td>
                    <td>
                      {traj.diverged
                        ? c.diverged
                        : revealed >= traj.points.length
                          ? c.converged
                          : c.running}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function formatLoss(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  if (v < 1e-3 || v >= 1e4) return v.toExponential(2);
  return v.toFixed(4);
}

/* ==========================================================================
   Loss-vs-step chart
   ========================================================================== */

const CW = 560;
const CH = 300;
// `top` leaves room for the y-axis caption above the plot; `right` for the
// direct end-labels; `bottom` for the x-axis band and its caption.
const PAD = { top: 30, right: 92, bottom: 34, left: 52 };

interface LossChartProps {
  trajectories: Trajectory[];
  revealed: number;
  colorOf: (id: OptimizerId) => string;
  cursor: number | null;
  onCursor: (index: number | null) => void;
  labels: OptimizerSpec[];
  copy: Copy;
}

function LossChart({
  trajectories,
  revealed,
  colorOf,
  cursor,
  onCursor,
  labels,
  copy,
}: LossChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const maxStep = Math.max(1, ...trajectories.map((t) => t.losses.length - 1));

  // Loss spans decades, so the y axis is log. A linear axis would collapse
  // every converged run onto the baseline.
  const FLOOR = 1e-10;
  const all = trajectories.flatMap((t) => t.losses.filter((v) => Number.isFinite(v) && v > 0));
  const dataMin = all.length ? Math.min(...all) : FLOOR;
  const dataMax = all.length ? Math.max(...all) : 1;
  const loExp = Math.floor(Math.log10(Math.max(FLOOR, dataMin)));
  const hiExp = Math.ceil(Math.log10(Math.max(dataMax, dataMin * 10)));

  const xOf = (step: number) =>
    PAD.left + (step / maxStep) * (CW - PAD.left - PAD.right);
  const yOf = (loss: number) => {
    const e = Math.log10(Math.max(FLOOR, loss));
    const t = (e - loExp) / (hiExp - loExp || 1);
    return CH - PAD.bottom - t * (CH - PAD.top - PAD.bottom);
  };

  const ticks: number[] = [];
  const stride = Math.max(1, Math.ceil((hiExp - loExp) / 5));
  for (let e = loExp; e <= hiExp; e += stride) ticks.push(e);

  // End labels, nudged apart so two converged series do not overprint.
  const endLabels = trajectories
    .map((t) => {
      const upTo = Math.min(t.losses.length, Math.max(1, revealed));
      const step = upTo - 1;
      const loss = t.losses[step];
      if (loss === undefined) return null;
      const spec = labels.find((l) => l.id === t.id)!;
      return { id: t.id, label: spec.label, x: xOf(step), y: yOf(loss) };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => a.y - b.y);

  const MIN_GAP = 14;
  for (let i = 1; i < endLabels.length; i++) {
    const prev = endLabels[i - 1]!;
    const cur = endLabels[i]!;
    if (cur.y - prev.y < MIN_GAP) cur.y = prev.y + MIN_GAP;
  }

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * CW;
    const t = (px - PAD.left) / (CW - PAD.left - PAD.right);
    if (t < 0 || t > 1) {
      onCursor(null);
      return;
    }
    onCursor(Math.round(t * maxStep));
  };

  const cursorReadout =
    cursor === null
      ? null
      : trajectories
          .map((t) => {
            const i = Math.min(cursor, Math.max(0, Math.min(t.losses.length, revealed) - 1));
            const loss = t.losses[i];
            const spec = labels.find((l) => l.id === t.id)!;
            return loss === undefined ? null : { id: t.id, label: spec.label, loss };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null);

  return (
    <div className="lab__chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CW} ${CH}`}
        className="lab__chart-svg"
        role="img"
        aria-label={copy.curveTitle}
        tabIndex={0}
        onPointerMove={handleMove}
        onPointerLeave={() => onCursor(null)}
        onKeyDown={(e) => {
          // Keyboard gets the same readout as hover.
          if (e.key === 'ArrowRight') onCursor(Math.min(maxStep, (cursor ?? 0) + 1));
          else if (e.key === 'ArrowLeft') onCursor(Math.max(0, (cursor ?? 0) - 1));
          else if (e.key === 'Escape') onCursor(null);
          else return;
          e.preventDefault();
        }}
      >
        {/* Solid hairline gridlines — never dashed. */}
        {ticks.map((e) => (
          <g key={e}>
            <line
              className="lab__grid"
              x1={PAD.left}
              x2={CW - PAD.right}
              y1={yOf(10 ** e)}
              y2={yOf(10 ** e)}
              vectorEffect="non-scaling-stroke"
            />
            <text className="lab__tick" x={PAD.left - 8} y={yOf(10 ** e)} textAnchor="end" dy="0.32em">
              1e{e}
            </text>
          </g>
        ))}

        <line
          className="lab__axis"
          x1={PAD.left}
          x2={CW - PAD.right}
          y1={CH - PAD.bottom}
          y2={CH - PAD.bottom}
          vectorEffect="non-scaling-stroke"
        />
        {[0, Math.round(maxStep / 2), maxStep].map((s) => (
          <text key={s} className="lab__tick" x={xOf(s)} y={CH - PAD.bottom + 16} textAnchor="middle">
            {s}
          </text>
        ))}
        <text className="lab__axis-label" x={(PAD.left + CW - PAD.right) / 2} y={CH - 4} textAnchor="middle">
          {copy.stepAxis}
        </text>
        <text className="lab__axis-label" x={4} y={12}>
          {copy.lossAxis}
        </text>

        {cursor !== null && (
          <line
            className="lab__crosshair"
            x1={xOf(Math.min(cursor, maxStep))}
            x2={xOf(Math.min(cursor, maxStep))}
            y1={PAD.top}
            y2={CH - PAD.bottom}
            vectorEffect="non-scaling-stroke"
          />
        )}

        {trajectories.map((t) => {
          const upTo = Math.min(t.losses.length, Math.max(2, revealed));
          if (upTo < 2) return null;
          const d = t.losses
            .slice(0, upTo)
            .map((loss, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)} ${yOf(loss).toFixed(1)}`)
            .join('');
          return (
            <path
              key={t.id}
              className="lab__curve"
              d={d}
              stroke={colorOf(t.id)}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* Direct labels: the relief channel for light-mode contrast. */}
        {endLabels.map((l) => (
          <text
            key={l.id}
            className="lab__end-label"
            x={Math.min(l.x + 8, CW - PAD.right + 8)}
            y={l.y}
            dy="0.32em"
            fill={colorOf(l.id)}
          >
            {l.label}
          </text>
        ))}
      </svg>

      <div className="lab__readout" role="status" aria-live="polite">
        {cursorReadout && cursorReadout.length > 0 && (
          <>
            <span className="lab__readout-step">
              {copy.step} {Math.min(cursor ?? 0, maxStep)}
            </span>
            {cursorReadout.map((r) => (
              <span key={r.id} className="lab__readout-row">
                <span className="lab__swatch" style={{ background: colorOf(r.id) }} />
                {r.label}
                <span className="lab__readout-value">{formatLoss(r.loss)}</span>
              </span>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
