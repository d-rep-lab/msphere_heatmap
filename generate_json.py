import json
import pandas as pd

CSV_PATH = "data/Carbon source utilization dataset for interactive heatmap F_Sayegh.12.5.25.csv"

KNOWN_STRAINS = ["Type 3", "TIGR4", "T4R", "MNZ11", "D39"]

CARBON_CANONICAL = {
    "glucosamine": "N-Acetyl-D-GlcNAc",
    "glucose": "Glucose",
    "galactose": "Galactose",
    "mannonse": "Mannose",  # typo in source CSV
}

ROWS = ["TIGR4", "T4R", "Type 3", "D39", "MNZ11"]
COLS = ["Glucose", "Galactose", "N-Acetyl-D-GlcNAc", "Mannose"]


def parse_row_label(label):
    label = label.replace("\xa0", " ").strip()
    for strain in KNOWN_STRAINS:
        if label.startswith(strain):
            raw_carbon = label[len(strain) :].strip()
            low = raw_carbon.lower()
            carbon = next(
                (
                    canonical
                    for key, canonical in CARBON_CANONICAL.items()
                    if key in low
                ),
                raw_carbon,
            )
            return strain, carbon
    raise ValueError(f"Unknown strain in label: {label!r}")


def main():
    df = pd.read_csv(CSV_PATH, index_col=0)
    # Drop any unnamed/empty trailing columns
    df = df.loc[:, ~df.columns.str.startswith("Unnamed")]
    timepoints = [
        int(float(c)) if float(c).is_integer() else float(c) for c in df.columns
    ]

    raw_data = []
    for label, row in df.iterrows():
        strain, carbon = parse_row_label(str(label))
        raw_data.append(
            {
                "strain": strain,
                "carbon": carbon,
                "od": [round(float(v), 3) for v in row],
            }
        )

    all_peaks = [max(d["od"]) for d in raw_data]

    cells = []
    series = []
    for d in raw_data:
        label = f"{d['strain']}|{d['carbon']}"
        peak = max(d["od"])
        cells.append(
            {
                "strain": d["strain"],
                "carb": d["carbon"],
                "max": round(peak, 3),
                "series_label": label,
            }
        )
        series.append(
            {
                "label": label,
                "values": [{"t": t, "v": v} for t, v in zip(timepoints, d["od"])],
            }
        )

    output = {
        "times": timepoints,
        "rows": ROWS,
        "cols": COLS,
        "global_min": round(min(all_peaks), 3),
        "global_max": round(max(all_peaks), 3),
        "cells": cells,
        "series": series,
    }

    with open("carbon_heatmap_data.json", "w") as f:
        json.dump(output, f, indent=2)


if __name__ == "__main__":
    main()
