"""Generate every number, dataset and static figure used by the beam article.

Run from any directory. No model pickle, GPU, mesh solver or browser is needed.
All physical calculations use SI; the public data uses mm, kg and N.
"""
import os

# Set before NumPy is imported, including when the caller already set these.
for name in ("OPENBLAS_NUM_THREADS", "OMP_NUM_THREADS", "MKL_NUM_THREADS"):
    os.environ[name] = "1"

import argparse
import csv
import hashlib
import json
import platform
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LogNorm, LinearSegmentedColormap
from matplotlib.patches import Rectangle
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
import numpy as np
import scipy
from scipy.stats import spearmanr
import sklearn
from sklearn.kernel_ridge import KernelRidge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[2]
SEED = 20260921
PHYSICS = dict(length_m=0.5, young_pa=70e9, force_n=10.0,
               density_kg_m3=2700.0, mass_limit_kg=0.54)
LOW, HIGH, STEP = 10.0, 40.0, 0.5
N_TRAIN, N_VALIDATION, N_TEST = 180, 60, 60
ALPHAS = (1e-6, 1e-4, 1e-2)
GAMMAS = (0.1, 0.5, 2.0)


def truth(x):
    """Euler–Bernoulli end-load deflection magnitude [mm], mass [kg]."""
    b, h = np.asarray(x, dtype=float).T * 1e-3
    if np.any(b <= 0) or np.any(h <= 0):
        raise ValueError("Cross-section dimensions must be positive")
    p = PHYSICS
    inertia = b * h**3 / 12
    delta = p["force_n"] * p["length_m"]**3 / (3 * p["young_pa"] * inertia)
    mass = p["density_kg_m3"] * p["length_m"] * b * h
    return delta * 1e3, mass


def metrics(y, pred):
    relative = np.abs(pred - y) / y * 100
    return dict(n=len(y), mae_mm=float(mean_absolute_error(y, pred)),
                rmse_mm=float(np.sqrt(np.mean((pred-y)**2))),
                mape_pct=float(np.mean(relative)),
                p95_relative_error_pct=float(np.percentile(relative, 95)),
                max_relative_error_pct=float(np.max(relative)),
                r2=float(r2_score(y, pred)),
                spearman=float(spearmanr(y, pred).statistic))


def write_csv(path, rows):
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def candidate_row(i, x, pred, y, mass):
    return dict(id=int(i), b_mm=round(float(x[0]), 8), h_mm=round(float(x[1]), 8),
                predicted_deflection_mm=round(float(pred), 10),
                truth_deflection_mm=round(float(y), 10),
                mass_kg=round(float(mass), 10),
                feasible=bool(mass <= PHYSICS["mass_limit_kg"] + 1e-12),
                relative_error_pct=round(float(abs(pred-y)/y*100), 8))


def figures(out, axis, x, pred, y, mass, train_x, test_y, test_pred, baseline, best, fallback):
    out.mkdir(parents=True, exist_ok=True)
    fallback.parent.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 11,
                         "axes.spines.top": False, "axes.spines.right": False,
                         "figure.facecolor": "#f7f7f5", "axes.facecolor": "#f7f7f5"})
    # Reuse the current site's documented neutral ramp and categorical slots.
    neutral = LinearSegmentedColormap.from_list("site-neutral", ["#fbfbf9", "#eeede8", "#e1e0d9", "#ceccc3", "#b4b2a9", "#97958d", "#767471"])
    shape = (len(axis), len(axis))
    bb, hh = np.meshgrid(axis, axis)
    extent = [LOW-STEP/2, HIGH+STEP/2, LOW-STEP/2, HIGH+STEP/2]

    def map_axes(ax):
        ax.set(xlabel="Width b [mm]", ylabel="Height h [mm]", xlim=(9.75, 40.25),
               ylim=(9.75, 40.25), xticks=[10, 20, 30, 40], yticks=[10, 20, 30, 40])
        ax.set_aspect("equal")

    fig, ax = plt.subplots(figsize=(7.4, 6.2), layout="constrained")
    im = ax.imshow(pred.reshape(shape), origin="lower", extent=extent,
                   cmap=neutral, norm=LogNorm(pred.min(), pred.max()), interpolation="nearest")
    # Hatch only the exact analytical forbidden region, not a learned classifier.
    dense = np.linspace(LOW, HIGH, 301)
    ax.fill_between(dense, 400/dense, HIGH, facecolor="none", edgecolor="#8b8b8b", hatch="///")
    ax.plot(dense, 400/dense, color="white", linewidth=2)
    ax.plot(dense, 400/dense, color="#242c38", linewidth=.8)
    ax.scatter(*baseline, c="#2a78d6", marker="o", s=105, edgecolor="white", label="Baseline")
    ax.scatter(*best, c="#eb6834", marker="*", s=230, edgecolor="white", label="Predicted best feasible", clip_on=False)
    map_axes(ax)
    ax.set_title("3,721 predicted shapes · lower deflection is better", pad=16)
    ax.legend(loc="upper right", fontsize=9, framealpha=.95)
    fig.colorbar(im, ax=ax, label="Predicted tip deflection [mm] · log color scale", shrink=.85)
    fig.text(.12, -.035, "Hatching: mass > 0.540 kg. Cells are sampled candidates, not interpolation.", fontsize=10)
    fig.savefig(fallback, dpi=170, bbox_inches="tight")
    plt.close(fig)

    fig, axs = plt.subplots(1, 2, figsize=(11.4, 4.7), layout="constrained")
    axs[0].scatter(test_y, test_pred, s=25, c="#2a78d6", alpha=.8)
    limits = [min(test_y.min(), test_pred.min())*.8, max(test_y.max(), test_pred.max())*1.2]
    axs[0].plot(limits, limits, "--", color="#777777", linewidth=1)
    axs[0].set(xscale="log", yscale="log", xlim=limits, ylim=limits,
               xlabel="Analytical truth [mm]", ylabel="Model prediction [mm]",
               title=f"Held-out test · {len(test_y)} unseen shapes")
    axs[0].grid(alpha=.18)
    err = (np.abs(pred-y)/y*100).reshape(shape)
    im = axs[1].imshow(err, origin="lower", extent=extent, cmap=neutral, interpolation="nearest")
    axs[1].scatter(train_x[:, 0], train_x[:, 1], s=4, c="#16161a", alpha=.45)
    map_axes(axs[1])
    axs[1].set_title("Grid audit · dark dots = training shapes")
    fig.colorbar(im, ax=axs[1], label="Absolute relative error [%]", shrink=.82)
    fig.savefig(out / "validation.png", dpi=170)
    plt.close(fig)

    # Isometric views use the same x/y/z limits AND the same physical scale.
    fig = plt.figure(figsize=(10, 6.2), layout="constrained")
    shapes = [baseline, best]
    for k, ((b, h), label, color) in enumerate(zip(shapes, ["Baseline", "Selected candidate"], ["#2a78d6", "#eb6834"])):
        ax = fig.add_subplot(2, 2, k+1, projection="3d")
        v = np.array([[0,-b/2,0], [500,-b/2,0], [500,b/2,0], [0,b/2,0],
                      [0,-b/2,h], [500,-b/2,h], [500,b/2,h], [0,b/2,h]])
        faces = [[v[i] for i in face] for face in [[0,1,2,3],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]]]
        ax.add_collection3d(Poly3DCollection(faces, facecolors=color, edgecolors="#16161a", linewidths=.7, alpha=.85))
        ax.set(xlim=(0,500), ylim=(-30,30), zlim=(0,60))
        ax.set_box_aspect((500,60,60))
        ax.view_init(elev=22, azim=-65)
        ax.set_axis_off()
        ax.set_title(f"{label}: b={b:g}, h={h:g} mm\nUndeformed beam · L=500 mm", fontsize=12)
        ax = fig.add_subplot(2, 2, k+3)
        ax.add_patch(Rectangle((-b/2,0), b, h, color=color, alpha=.8))
        ax.set(xlim=(-26,26), ylim=(0,46), xlabel="Width [mm]", ylabel="Height [mm]")
        ax.set_aspect("equal")
        ax.grid(alpha=.18)
        d, m = truth(np.array([[b,h]]))
        ax.set_title(f"Cross-section · same scale\nTruth {d[0]:.4f} mm | mass {m[0]:.3f} kg", fontsize=11)
    fig.savefig(out / "shapes.png", dpi=170)
    plt.close(fig)


def run(root):
    data_dir = root / "public/data/beam-surrogate"
    image_dir = root / "src/assets/beam-surrogate"
    data_dir.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(SEED)
    x = rng.uniform(LOW, HIGH, size=(N_TRAIN+N_VALIDATION+N_TEST, 2))
    y, sample_mass = truth(x)
    order = rng.permutation(len(x))
    train, val, test = np.split(order, [N_TRAIN, N_TRAIN+N_VALIDATION])
    splits = np.empty(len(x), dtype=object)
    splits[train], splits[val], splits[test] = "train", "validation", "test"

    trials, models = [], []
    for alpha in ALPHAS:
        for gamma in GAMMAS:
            model = make_pipeline(StandardScaler(), KernelRidge(alpha=alpha, gamma=gamma, kernel="rbf"))
            model.fit(x[train], np.log(y[train]))  # log(delta / 1 mm); no fitted target scaler
            val_pred = np.exp(model.predict(x[val]))
            trials.append(dict(alpha=alpha, gamma=gamma, **metrics(y[val], val_pred)))
            models.append(model)
    chosen = int(np.argmin([r["mape_pct"] for r in trials]))
    model = models[chosen]  # Keep this model; do not refit on validation or test.
    sample_pred = np.exp(model.predict(x))
    test_result = metrics(y[test], sample_pred[test])

    axis = np.arange(LOW, HIGH+STEP/2, STEP)
    bb, hh = np.meshgrid(axis, axis)
    grid = np.column_stack([bb.ravel(), hh.ravel()])
    pred = np.exp(model.predict(grid))  # Inference BEFORE grid truth is inspected.
    mass = PHYSICS["density_kg_m3"] * PHYSICS["length_m"] * np.prod(grid*1e-3, axis=1)
    feasible = mass <= PHYSICS["mass_limit_kg"] + 1e-12
    feasible_ids = np.flatnonzero(feasible)
    ranked = feasible_ids[np.argsort(pred[feasible], kind="stable")]
    selected_ids = ranked[:5]  # Fix shortlist from model predictions alone.
    checked_truth, checked_mass = truth(grid[selected_ids])  # Original evaluator, fresh call.
    grid_y, grid_mass = truth(grid)  # Audit all candidates; never feeds model selection.
    assert np.allclose(mass, grid_mass)
    truth_ranked = feasible_ids[np.argsort(grid_y[feasible], kind="stable")]
    best = int(selected_ids[0])
    true_best = int(truth_ranked[0])
    base = int(np.flatnonzero(np.all(grid == [20,20], axis=1))[0])
    relative = np.abs(pred-grid_y)/grid_y*100
    worst = int(np.argmax(relative))
    boundary = np.any((grid <= LOW+2) | (grid >= HIGH-2), axis=1)

    rows = [candidate_row(i, v, pred[i], grid_y[i], mass[i]) for i, v in enumerate(grid)]
    sample_rows = [dict(id=i, split=splits[i], b_mm=float(v[0]), h_mm=float(v[1]),
                        truth_deflection_mm=float(y[i]), predicted_deflection_mm=float(sample_pred[i]),
                        mass_kg=float(sample_mass[i])) for i, v in enumerate(x)]
    shortlisted = [dict(predicted_rank=k+1, **candidate_row(i, grid[i], pred[i], checked_truth[k], checked_mass[k]))
                   for k, i in enumerate(selected_ids)]
    write_csv(data_dir / "samples.csv", sample_rows)
    write_csv(data_dir / "candidates.csv", rows)
    write_csv(data_dir / "shortlist.csv", shortlisted)
    summary = dict(
        schema_version=1, seed=SEED,
        versions=dict(python=platform.python_version(), numpy=np.__version__, scipy=scipy.__version__,
                      sklearn=sklearn.__version__, matplotlib=matplotlib.__version__),
        physics=PHYSICS, domain=dict(min_mm=LOW, max_mm=HIGH, step_mm=STEP),
        split=dict(train=N_TRAIN, validation=N_VALIDATION, test=N_TEST),
        model=dict(type="StandardScaler + RBF KernelRidge on log(delta / 1 mm)",
                   alpha=trials[chosen]["alpha"], gamma=trials[chosen]["gamma"],
                   scaler_mean=model[0].mean_.tolist(), scaler_scale=model[0].scale_.tolist(),
                   selection="lowest validation MAPE; no refit", trials=trials),
        validation=trials[chosen], test=test_result,
        grid=dict(n=len(grid), feasible_n=int(feasible.sum()), **{k:v for k,v in metrics(grid_y,pred).items() if k != "n"},
                  feasible_spearman=float(spearmanr(grid_y[feasible],pred[feasible]).statistic),
                  top20_overlap=int(len(set(ranked[:20]) & set(truth_ranked[:20]))),
                  selection_regret_pct=float((grid_y[best]/grid_y[true_best]-1)*100),
                  boundary_mape_pct=float(relative[boundary].mean()),
                  interior_mape_pct=float(relative[~boundary].mean()), worst=rows[worst]),
        baseline=rows[base], selected=rows[best], grid_truth_best=rows[true_best], shortlist=shortlisted,
        improvement_pct=float((1-checked_truth[0]/grid_y[base])*100),
        sanity=dict(max_truth_deflection_mm=float(grid_y.max()),
                    max_deflection_length_ratio=float(grid_y.max()/500), min_length_height_ratio=500/HIGH,
                    max_bending_stress_mpa=float(6*10*.5/(.01*.01**2)/1e6)),
        hashes={name:hashlib.sha256((data_dir/name).read_bytes()).hexdigest()
                for name in ["samples.csv", "candidates.csv", "shortlist.csv"]})
    (data_dir / "results.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    # Compact, named columns preserve prediction/truth provenance in browser data.
    browser = dict(physics=PHYSICS, axis_mm=axis.tolist(), baseline_id=base, selected_id=best,
                   columns=list(rows[0]), rows=[list(r.values()) for r in rows],
                   color_scale=dict(type="log", min=float(pred.min()), max=float(pred.max())))
    (data_dir / "explorer.json").write_text(json.dumps(browser, separators=(",",":"))+"\n", encoding="utf-8")
    figures(image_dir, axis, grid, pred, grid_y, mass, x[train], y[test], sample_pred[test], grid[base], grid[best],
            root / "public/images/2026-09-21-beam-surrogate/design-space.png")
    print(json.dumps({k:summary[k] for k in ["validation","test","grid","baseline","selected","improvement_pct"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-root", type=Path, default=ROOT,
                        help="Default: repository root. Use a temporary directory for an isolated rerun.")
    run(parser.parse_args().output_root.resolve())
