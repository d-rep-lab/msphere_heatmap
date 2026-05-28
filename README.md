# Carbon Source Utilization Heatmap

Interactive heatmap visualizing carbon source utilization (OD readings over time) for *Streptococcus pneumoniae* strains.

## Data

Raw data is in `\data` e.g., (`\data\total data.xlsx`). The script assumes a two-sheet Excel workbook:

| Sheet | Contents |
|-------|----------|
| Sheet1 | Time-series OD readings. Row 0 = timepoints; column A = `<strain> <carbon>` labels. |
| Sheet2 | Lookup grid that defines strain and carbon-source ordering. Row 0 = carbon sources; column A = strains. |

`generate_json.py` reads the Excel workbook, parses the strain/carbon labels using the Sheet2 ordering, and writes `data/carbon_heatmap_data.json` for the visualization.

To regenerate the JSON after updating the workbook:

```bash
pip install openpyxl
python generate_json.py
```

The script prints a summary line (`N strains × M carbons = K cells`) and logs any rows it couldn't parse to stderr.

## Running locally

The visualization fetches `data/carbon_heatmap_data.json` via `fetch()`, so opening `index.html` directly as a `file://` URL will be blocked by CORS. Serve it with a local HTTP server instead:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Visualization

Built with [D3.js](https://d3js.org).

- **Color scale** — Viridis, mapped to the global min/max peak OD across all strain/carbon combinations.
- **Cell labels** — Peak OD values are printed inside each cell when cells are large enough (≥ 18 px).
- **Tooltip** — Hovering over a cell shows the full OD growth curve for that strain/carbon combination, including the peak timepoint.
