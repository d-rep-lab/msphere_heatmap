(async function () {
  const data = await fetch("./data/carbon_heatmap_data.json").then(r => r.json());

  const seriesByKey = new Map(data.series.map(d => [d.label, d]));

  // ---- Color scale (Viridis) ----
  const color = d3.scaleSequential(d3.interpolateViridis)
    .domain([data.global_min, data.global_max]);

  // ---- Legend ----
  const legendSvg = d3.select("#legend-svg");
  const lw = +legendSvg.attr("width"), lh = +legendSvg.attr("height");
  const grad = legendSvg.append("defs").append("linearGradient")
    .attr("id", "leg-grad").attr("x1", "0%").attr("x2", "100%");
  d3.range(0, 1.001, 0.05).forEach(t =>
    grad.append("stop")
      .attr("offset", (t * 100) + "%")
      .attr("stop-color", color(data.global_min + t * (data.global_max - data.global_min)))
  );
  legendSvg.append("rect").attr("width", lw).attr("height", lh).attr("rx", 3)
    .attr("fill", "url(#leg-grad)");

  // ---- Tooltip chart setup ----
  const tooltip = d3.select("#tooltip");
  const tooltipTitle = d3.select("#ttTitle");
  const tooltipMeta = d3.select("#ttMeta");
  const tooltipSvg = d3.select("#ttSvg");
  const tw = +tooltipSvg.attr("width"), th = +tooltipSvg.attr("height");
  const tm = { top: 8, right: 10, bottom: 22, left: 34 };
  const tiw = tw - tm.left - tm.right;
  const tih = th - tm.top - tm.bottom;
  const ttg = tooltipSvg.append("g").attr("transform", `translate(${tm.left},${tm.top})`);

  const times = data.times.map(Number);
  const ttX = d3.scaleLinear().domain(d3.extent(times)).range([0, tiw]);
  const ttY = d3.scaleLinear().domain([0, data.global_max]).nice().range([tih, 0]);

  ttg.append("g").attr("class", "axis").attr("transform", `translate(0,${tih})`)
    .call(d3.axisBottom(ttX).ticks(5));
  ttg.append("g").attr("class", "axis")
    .call(d3.axisLeft(ttY).ticks(4));

  const ttLine = d3.line().x(d => ttX(d.t)).y(d => ttY(d.v));
  const ttPath = ttg.append("path").attr("fill", "none")
    .attr("stroke", "rgba(17,17,17,0.8)").attr("stroke-width", 1.6);

  const ttPeak = ttg.append("line")
    .attr("stroke", "rgba(17,17,17,0.3)").attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3").attr("y1", 0).attr("y2", tih);

  const ttDot = ttg.append("circle").attr("r", 3.2)
    .attr("fill", "rgba(17,17,17,0.9)")
    .attr("stroke", "rgba(255,255,255,0.9)").attr("stroke-width", 1.4);

  // ---- Heatmap layout ----
  // Grid is constrained to a fixed GRID_SIDE × GRID_SIDE bounding box.
  // Cell size is computed so the larger axis fits exactly, keeping cells square.
  const GRID_SIDE = 900;
  const cols = data.cols;
  const rows = data.rows;
  const cellGap = 2;
  const n = Math.max(cols.length, rows.length);
  const cellSize = Math.max(14, Math.floor((GRID_SIDE - cellGap * (n - 1)) / n));
  const fontSize = Math.max(7, Math.floor(cellSize * 0.22));

  const margin = { top: 165, right: 20, bottom: 20, left: 90 };
  const gridW = cols.length * cellSize + (cols.length - 1) * cellGap;
  const gridH = rows.length * cellSize + (rows.length - 1) * cellGap;
  const svgW = margin.left + gridW + margin.right;
  const svgH = margin.top + gridH + margin.bottom;

  // Position helpers — index-based, no scaleBand needed
  const xOf = i => margin.left + i * (cellSize + cellGap);
  const yOf = i => margin.top + i * (cellSize + cellGap);
  const colIdx = new Map(cols.map((c, i) => [c, i]));
  const rowIdx = new Map(rows.map((r, i) => [r, i]));

  const svg = d3.select("#chart").append("svg")
    .attr("width", svgW).attr("height", svgH);

  // ---- Column axis (top, rotated labels) ----
  const colAxis = svg.append("g").attr("class", "axis");
  cols.forEach((c, i) => {
    const cx = xOf(i) + cellSize / 2;
    colAxis.append("line")
      .attr("x1", cx).attr("x2", cx)
      .attr("y1", margin.top - 4).attr("y2", margin.top)
      .attr("stroke", "rgba(0,0,0,0.15)");
    colAxis.append("text")
      .attr("transform", `translate(${cx},${margin.top - 8}) rotate(-60)`)
      .attr("text-anchor", "beginning")
      .attr("dominant-baseline", "middle")
      .attr("fill", "rgba(17,17,17,0.75)")
      .attr("font-size", 11)
      .text(c);
  });

  // ---- Row axis (left) ----
  const rowAxis = svg.append("g").attr("class", "axis");
  rows.forEach((r, i) => {
    const cy = yOf(i) + cellSize / 2;
    rowAxis.append("line")
      .attr("x1", margin.left - 4).attr("x2", margin.left)
      .attr("y1", cy).attr("y2", cy)
      .attr("stroke", "rgba(0,0,0,0.15)");
    rowAxis.append("text")
      .attr("x", margin.left - 8)
      .attr("y", cy)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "middle")
      .attr("fill", "rgba(17,17,17,0.75)")
      .attr("font-size", 11)
      .text(r);
  });

  // ---- Cells ----
  svg.append("g")
    .selectAll("rect")
    .data(data.cells, d => d.strain + "|" + d.carb)
    .join("rect")
    .attr("class", "cell")
    .attr("x", d => xOf(colIdx.get(d.carb)))
    .attr("y", d => yOf(rowIdx.get(d.strain)))
    .attr("width", cellSize)
    .attr("height", cellSize)
    .attr("rx", Math.max(2, Math.floor(cellSize * 0.12)))
    .attr("fill", d => color(d.max))
    .on("mouseenter", (event, d) => {
      const series = seriesByKey.get(d.series_label);
      if (!series) return;
      tooltip.style("display", "block");
      tooltipTitle.text(`${d.strain} · ${d.carb}`);
      const peak = series.values.reduce((b, c) => c.v > b.v ? c : b, series.values[0]);
      tooltipMeta.text(`peak = ${d.max.toFixed(3)} at t = ${peak.t} h`);
      ttPath.attr("d", ttLine(series.values));
      ttPeak.attr("x1", ttX(peak.t)).attr("x2", ttX(peak.t));
      ttDot.attr("cx", ttX(peak.t)).attr("cy", ttY(peak.v));
    })
    .on("mousemove", event => {
      const pad = 14;
      const { clientX, clientY } = event;
      const tb = tooltip.node().getBoundingClientRect();
      let xp = clientX + pad, yp = clientY + pad;
      if (xp + tb.width > window.innerWidth) xp = clientX - tb.width - pad;
      if (yp + tb.height > window.innerHeight) yp = clientY - tb.height - pad;
      tooltip.style("left", xp + "px").style("top", yp + "px");
    })
    .on("mouseleave", () => tooltip.style("display", "none"));

  // Value labels inside cells (hidden when cells are too small)
  if (cellSize >= 18) {
    svg.append("g")
      .selectAll("text")
      .data(data.cells, d => d.strain + "|" + d.carb)
      .join("text")
      .attr("x", d => xOf(colIdx.get(d.carb)) + cellSize / 2)
      .attr("y", d => yOf(rowIdx.get(d.strain)) + cellSize / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "rgba(255,255,255,0.9)")
      .attr("font-size", fontSize)
      .attr("font-weight", 700)
      .text(d => d.max.toFixed(2));
  }

})();
