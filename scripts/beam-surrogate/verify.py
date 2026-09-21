"""Check physical units, provenance, splits, selection and published data."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

from experiment import (ROOT, N_TRAIN, PHYSICS, metrics, truth, np,
                        make_pipeline, StandardScaler, KernelRidge)


def load_csv(path):
    with path.open(encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    for row in rows:
        for key, value in row.items():
            if key in ("id", "predicted_rank"):
                row[key] = int(value)
            elif key == "feasible":
                assert value in ("True", "False")
                row[key] = value == "True"
            elif key != "split":
                row[key] = float(value)
    return rows


def values(rows, field):
    return np.array([r[field] for r in rows])


def near(a, b, atol=1e-8):
    np.testing.assert_allclose(a, b, atol=atol, rtol=1e-7)


def main(root, compare):
    data = root / "public/data/beam-surrogate"
    summary = json.loads((data / "results.json").read_text())
    for name, digest in summary["hashes"].items():
        assert hashlib.sha256((data/name).read_bytes()).hexdigest() == digest, name
    for png in ("design-space.png", "validation.png", "shapes.png"):
        directory = "public/images/2026-09-21-beam-surrogate" if png == "design-space.png" else "src/assets/beam-surrogate"
        assert (root / directory / png).read_bytes()[:8] == b"\x89PNG\r\n\x1a\n"

    # Independent physical invariants expose millimetre/metre and bending-axis mistakes.
    d, m = truth([[20,20], [10,40], [40,10], [20,40]])
    near(d, [25/56, 25/224, 25/14, 25/448])
    near(m, [.54, .54, .54, 1.08])
    assert summary["physics"] == PHYSICS

    samples = load_csv(data / "samples.csv")
    grid = load_csv(data / "candidates.csv")
    shortlist = load_csv(data / "shortlist.csv")
    train = [r for r in samples if r["split"] == "train"]
    assert len(samples) == 300 and len(train) == N_TRAIN
    for split, count in summary["split"].items():
        assert sum(r["split"] == split for r in samples) == count
    assert len(grid) == 3721 and len(shortlist) == 5
    coordinates = lambda rows: {(r["b_mm"], r["h_mm"]) for r in rows}
    assert len(coordinates(samples)) == len(samples)
    assert len(coordinates(grid)) == len(grid)
    assert not (coordinates(samples) & coordinates(grid))
    train_x = np.array([[r["b_mm"], r["h_mm"]] for r in train])
    near(train_x.mean(axis=0), summary["model"]["scaler_mean"])
    near(train_x.std(axis=0), summary["model"]["scaler_scale"])
    winner = min(summary["model"]["trials"], key=lambda r:r["mape_pct"])
    for key in ("alpha", "gamma"):
        assert summary["model"][key] == winner[key]

    # Restore original training order: sorting changes only numerical roundoff.
    model = make_pipeline(StandardScaler(), KernelRidge(
        kernel="rbf", alpha=winner["alpha"], gamma=winner["gamma"]))
    model.fit(train_x, np.log(values(train, "truth_deflection_mm")))
    for rows in (samples, grid):
        x = np.array([[r["b_mm"], r["h_mm"]] for r in rows])
        assert np.all((x >= 10) & (x <= 40))
        y, mass = truth(x)
        near(y, values(rows, "truth_deflection_mm"))
        near(mass, values(rows, "mass_kg"))
        pred = values(rows, "predicted_deflection_mm")
        assert np.all(np.isfinite(pred)) and np.all(pred > 0)
        near(np.exp(model.predict(x)), pred)
        if rows is grid:
            assert list(values(rows, "id")) == list(range(3721))
            near(x[:,0], np.tile(np.arange(10,40.1,.5),61))
            near(x[:,1], np.repeat(np.arange(10,40.1,.5),61))
            assert np.array_equal(mass <= .54+1e-12, values(rows,"feasible"))
            near(abs(pred-y)/y*100, values(rows,"relative_error_pct"), atol=2e-6)

    for split in ("validation", "test"):
        rows = [r for r in samples if r["split"] == split]
        measured = metrics(values(rows,"truth_deflection_mm"), values(rows,"predicted_deflection_mm"))
        for k, v in measured.items():
            near(v, summary[split][k])
    measured = metrics(values(grid,"truth_deflection_mm"), values(grid,"predicted_deflection_mm"))
    for k, v in measured.items():
        near(v, summary["grid"][k], atol=2e-6)
    valid = [r for r in grid if r["feasible"]]
    assert len(valid) == summary["grid"]["feasible_n"]
    predicted = sorted(valid, key=lambda r:r["predicted_deflection_mm"])
    actual = sorted(valid, key=lambda r:r["truth_deflection_mm"])
    assert [r["id"] for r in shortlist] == [r["id"] for r in predicted[:5]]
    for rank, row in enumerate(shortlist, 1):
        assert row["predicted_rank"] == rank
        assert {k:v for k,v in row.items() if k != "predicted_rank"} == grid[row["id"]]
    assert summary["selected"] == predicted[0]
    assert summary["grid_truth_best"] == actual[0]
    assert summary["baseline"] == grid[1240]
    near((1-predicted[0]["truth_deflection_mm"]/grid[1240]["truth_deflection_mm"])*100,
         summary["improvement_pct"])
    assert len({r["id"] for r in predicted[:20]} & {r["id"] for r in actual[:20]}) == summary["grid"]["top20_overlap"]
    near((predicted[0]["truth_deflection_mm"]/actual[0]["truth_deflection_mm"]-1)*100,
         summary["grid"]["selection_regret_pct"])

    browser = json.loads((data / "explorer.json").read_text())
    assert [dict(zip(browser["columns"], row)) for row in browser["rows"]] == grid
    assert browser["baseline_id"] == summary["baseline"]["id"]
    assert browser["selected_id"] == summary["selected"]["id"]
    assert browser["color_scale"]["type"] == "log"
    if compare:
        for name in ("samples.csv", "candidates.csv", "shortlist.csv"):
            other = load_csv(compare / "public/data/beam-surrogate" / name)
            ours = load_csv(data/name)
            assert len(other) == len(ours)
            for a,b in zip(ours, other):
                assert a.keys() == b.keys()
                for key in a:
                    if isinstance(a[key], float):
                        near(a[key], b[key], atol=2e-6)
                    else:
                        assert a[key] == b[key]
        print("PASS: independent rerun agrees with published numerical data")
    print("PASS: physical units, disjoint splits, train-only scaling, model selection, metrics,")
    print("      3,721 candidates, shortlist re-evaluation, hashes and browser/article data")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--compare-root", type=Path)
    args = parser.parse_args()
    main(args.root.resolve(), args.compare_root.resolve() if args.compare_root else None)
