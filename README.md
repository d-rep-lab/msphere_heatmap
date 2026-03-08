# Carbon Source Utilization Heatmap

Interactive heatmap visualizing carbon source utilization (OD readings over time) for Streptococcus pneumoniae strains.

## Data

Raw growth data lives in `data/` as a CSV file. The script `generate_json.py` reads that CSV, parses strain/carbon-source labels, and outputs `carbon_heatmap_data.json`, which is used for the visualization.

To regenerate the JSON after updating the CSV:

```bash
pip install pandas
python generate_json.py
```

## Running locally

Because the visualization fetches `carbon_heatmap_data.json` via `fetch()`, you need a local HTTP server (opening `index.html` directly as a `file://` URL will be blocked by CORS).

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Visualization

The heatmap is built with [D3.js](https://d3js.org). Hovering over a cell displays an OD growth curve for that strain/carbon-source combination.
