#!/usr/bin/python3
"""Build fixed-scale ridge and valley interpretation lines from gameplay heights.

The derived vectors are display-only.  They never replace the 2 m height field
used by movement, LOS, collision, or path finding.
"""
from __future__ import annotations

import argparse
import base64
import json
import math
from pathlib import Path
from typing import Iterable

import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/rasdorf_4km.json"
OUTPUT = ROOT / "data/terrain-readability.json"
SCRIPT_OUTPUT = ROOT / "src/terrain-data.js"

PARAMETERS = {
    "analysisSpacingMetres": 20,
    "smoothingSigmaMetres": 40,
    "flowAccumulationCells": 120,
    "crossSectionOffsetMetres": 60,
    "crossReliefPercentile": 60,
    "minimumCrossReliefMetres": 0.5,
    "minimumLengthMetres": 180,
    "boundaryMarginMetres": 60,
    "simplifyToleranceMetres": 5,
}

D8 = (
    (-1, -1, math.sqrt(2)), (-1, 0, 1), (-1, 1, math.sqrt(2)),
    (0, -1, 1),                         (0, 1, 1),
    (1, -1, math.sqrt(2)),  (1, 0, 1),  (1, 1, math.sqrt(2)),
)


def decode_heights(data: dict) -> np.ndarray:
    spec = data["heightmap"]
    encoded = base64.b64decode(spec["data"])
    heights = np.empty((spec["rows"], spec["columns"]), dtype=np.float32)
    offset = 0
    for row in heights:
        value = 0
        for column in range(len(row)):
            delta = shift = 0
            while True:
                byte = encoded[offset]
                offset += 1
                delta |= (byte & 127) << shift
                if byte < 128:
                    break
                shift += 7
            value += (delta >> 1) ^ -(delta & 1)
            row[column] = value * spec["scale"]
    if offset != len(encoded):
        raise ValueError("height stream has trailing bytes")
    return heights


def downsample_mean(heights: np.ndarray, source_spacing: float, target_spacing: float) -> np.ndarray:
    factor = target_spacing / source_spacing
    rounded = round(factor)
    if not math.isclose(factor, rounded) or rounded < 1:
        raise ValueError("analysis spacing must be an integer multiple of source spacing")
    rows = heights.shape[0] // rounded
    columns = heights.shape[1] // rounded
    cropped = heights[:rows * rounded, :columns * rounded]
    return cropped.reshape(rows, rounded, columns, rounded).mean(axis=(1, 3), dtype=np.float64).astype(np.float32)


def d8_flow(heights: np.ndarray, kind: str, boundary_cells: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Return downstream index, accumulation, and directed drop.

    Valleys drain down the surface.  Ridges use the same deterministic drainage
    calculation on the inverted surface, so converging paths follow divides.
    """
    if kind not in {"ridge", "valley"}:
        raise ValueError(kind)
    sign = 1 if kind == "valley" else -1
    rows, columns = heights.shape
    destination = np.full(heights.size, -1, dtype=np.int32)
    best_drop = np.zeros_like(heights, dtype=np.float32)
    row_index = np.arange(rows)[:, None]
    column_index = np.arange(columns)[None, :]
    for dr, dc, distance in D8:
        shifted = np.full_like(heights, np.nan)
        source_rows = slice(max(0, -dr), min(rows, rows - dr))
        source_columns = slice(max(0, -dc), min(columns, columns - dc))
        target_rows = slice(max(0, dr), min(rows, rows + dr))
        target_columns = slice(max(0, dc), min(columns, columns + dc))
        shifted[source_rows, source_columns] = heights[target_rows, target_columns]
        drop = sign * (heights - shifted) / distance
        selected = drop > best_drop + 1e-7
        best_drop[selected] = drop[selected]
        neighbour = (row_index + dr) * columns + column_index + dc
        destination[selected.ravel()] = neighbour[selected].astype(np.int32)

    boundary = np.zeros_like(heights, dtype=bool)
    boundary[:boundary_cells] = boundary[-boundary_cells:] = True
    boundary[:, :boundary_cells] = boundary[:, -boundary_cells:] = True
    destination[boundary.ravel()] = -1

    accumulation = np.ones(heights.size, dtype=np.float64)
    # Actual high-to-low for valleys, low-to-high for inverted ridge drainage.
    order = np.argsort((-sign * heights).ravel(), kind="stable")
    for index in order:
        target = destination[index]
        if target >= 0:
            accumulation[target] += accumulation[index]
    return destination, accumulation.reshape(heights.shape), best_drop


def cross_relief(heights: np.ndarray, destination: np.ndarray, kind: str, offset_cells: float) -> np.ndarray:
    """Measure centre height against both sides perpendicular to line travel."""
    sign = 1 if kind == "valley" else -1
    rows, columns = heights.shape
    result = np.zeros_like(heights, dtype=np.float32)
    margin = math.ceil(offset_cells)
    for row in range(margin, rows - margin):
        for column in range(margin, columns - margin):
            target = destination[row * columns + column]
            if target < 0:
                continue
            target_row, target_column = divmod(int(target), columns)
            dy, dx = target_row - row, target_column - column
            length = math.hypot(dx, dy)
            perpendicular_x, perpendicular_y = -dy / length, dx / length
            coordinates = np.array([
                [row + perpendicular_y * offset_cells, row - perpendicular_y * offset_cells],
                [column + perpendicular_x * offset_cells, column - perpendicular_x * offset_cells],
            ])
            sides = map_coordinates(heights, coordinates, order=1, mode="nearest")
            # valley: sides-centre; ridge: centre-sides
            result[row, column] = sign * (float(sides.mean()) - float(heights[row, column]))
    return result


def graph_segments(destination: np.ndarray, selected: np.ndarray) -> list[list[int]]:
    ids = np.flatnonzero(selected.ravel())
    valid = set(map(int, ids))
    adjacency = {index: set() for index in valid}
    for raw_index in ids:
        index = int(raw_index)
        target = int(destination[index])
        if target in valid:
            adjacency[index].add(target)
            adjacency[target].add(index)

    def edge(a: int, b: int) -> tuple[int, int]:
        return (a, b) if a < b else (b, a)

    used: set[tuple[int, int]] = set()
    lines: list[list[int]] = []
    starts = sorted(index for index, neighbours in adjacency.items() if len(neighbours) != 2)
    for start in starts:
        for neighbour in sorted(adjacency[start]):
            if edge(start, neighbour) in used:
                continue
            line = [start]
            previous, current = start, neighbour
            used.add(edge(start, neighbour))
            while True:
                line.append(current)
                remaining = [value for value in adjacency[current]
                             if value != previous and edge(current, value) not in used]
                if len(adjacency[current]) != 2 or not remaining:
                    break
                following = remaining[0]
                used.add(edge(current, following))
                previous, current = current, following
            lines.append(line)
    # Strict flow makes cycles unlikely, but retain deterministic handling.
    for start in sorted(adjacency):
        for neighbour in sorted(adjacency[start]):
            if edge(start, neighbour) in used:
                continue
            line = [start]
            previous, current = start, neighbour
            used.add(edge(start, neighbour))
            while current != start:
                line.append(current)
                remaining = [value for value in adjacency[current]
                             if value != previous and edge(current, value) not in used]
                if not remaining:
                    break
                following = remaining[0]
                used.add(edge(current, following))
                previous, current = current, following
            lines.append(line)
    return lines


def length(points: Iterable[tuple[float, float]]) -> float:
    points = list(points)
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(points, points[1:]))


def chaikin(points: list[tuple[float, float]], iterations: int = 2) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    output = points
    for _ in range(iterations):
        refined = [output[0]]
        for a, b in zip(output, output[1:]):
            refined.extend(((a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25),
                            (a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75)))
        refined.append(output[-1])
        output = refined
    return output


def rdp(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    if len(points) <= 2:
        return points
    start, end = np.asarray(points[0]), np.asarray(points[-1])
    line = end - start
    norm = float(np.dot(line, line))
    middle = np.asarray(points[1:-1])
    if norm == 0:
        distances = np.linalg.norm(middle - start, axis=1)
    else:
        projection = np.clip(((middle - start) @ line) / norm, 0, 1)[:, None]
        distances = np.linalg.norm(middle - (start + projection * line), axis=1)
    maximum = float(distances.max(initial=0))
    if maximum <= tolerance:
        return [points[0], points[-1]]
    index = int(np.argmax(distances)) + 1
    return rdp(points[:index + 1], tolerance)[:-1] + rdp(points[index:], tolerance)


def derive_from_grid(heights: np.ndarray, spacing: float, parameters: dict | None = None) -> list[dict]:
    params = {**PARAMETERS, **(parameters or {})}
    sigma_cells = params["smoothingSigmaMetres"] / spacing
    smoothed = gaussian_filter(heights.astype(np.float32), sigma_cells, mode="nearest")
    boundary_cells = max(1, math.ceil(params["boundaryMarginMetres"] / spacing))
    offset_cells = params["crossSectionOffsetMetres"] / spacing
    rows, columns = smoothed.shape
    features: list[dict] = []
    for kind in ("ridge", "valley"):
        destination, accumulation, directed_drop = d8_flow(smoothed, kind, boundary_cells)
        relief = cross_relief(smoothed, destination, kind, offset_cells)
        selected = ((accumulation >= params["flowAccumulationCells"]) & (directed_drop > 1e-5)
                    & (destination.reshape(smoothed.shape) >= 0))
        for indexes in graph_segments(destination, selected):
            if len(indexes) < 2:
                continue
            raw_points = [((index % columns + .5) * spacing, (index // columns + .5) * spacing)
                          for index in indexes]
            raw_length = length(raw_points)
            support = float(np.percentile(relief.ravel()[indexes], params["crossReliefPercentile"]))
            if raw_length < params["minimumLengthMetres"] or support < params["minimumCrossReliefMetres"]:
                continue
            points = rdp(chaikin(raw_points), params["simplifyToleranceMetres"])
            rounded = [[round(x, 2), round(y, 2)] for x, y in points]
            xs, ys = zip(*rounded)
            maximum_accumulation = int(accumulation.ravel()[indexes].max())
            final_length = round(length(points), 1)
            if maximum_accumulation >= 2500 or final_length >= 700:
                minimum_zoom = .15
            elif maximum_accumulation >= 800 or final_length >= 350:
                minimum_zoom = .35
            else:
                minimum_zoom = .65
            features.append({
                "kind": kind,
                "points": rounded,
                "bounds": [min(xs), min(ys), max(xs), max(ys)],
                "lengthMetres": final_length,
                "maxAccumulationCells": maximum_accumulation,
                "crossReliefMetres": round(support, 3),
                "minimumZoom": minimum_zoom,
            })
    features.sort(key=lambda item: (item["kind"], item["points"][0][1], item["points"][0][0], -item["lengthMetres"]))
    return features


def build() -> dict:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    source_spacing = float(data["heightmap"]["spacing"])
    heights = decode_heights(data)
    analysis = downsample_mean(heights, source_spacing, PARAMETERS["analysisSpacingMetres"])
    lines = derive_from_grid(analysis, PARAMETERS["analysisSpacingMetres"])
    return {
        "schemaVersion": 1,
        "algorithm": "inverted-d8-cross-relief",
        "algorithmVersion": "1.0.0",
        "sourceMapHash": data["meta"]["mapHash"],
        "sourceHeightSpacingMetres": source_spacing,
        **PARAMETERS,
        "lineCounts": {
            "ridge": sum(line["kind"] == "ridge" for line in lines),
            "valley": sum(line["kind"] == "valley" for line in lines),
        },
        "lines": lines,
    }


def encoded_outputs(result: dict) -> tuple[str, str]:
    raw = json.dumps(result, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return raw + "\n", "const TERRAIN_DATA=" + raw + ";\n"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="fail if committed outputs are stale")
    args = parser.parse_args()
    result = build()
    data_text, script_text = encoded_outputs(result)
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text(encoding="utf-8") != data_text:
            raise SystemExit("data/terrain-readability.json is stale")
        if not SCRIPT_OUTPUT.exists() or SCRIPT_OUTPUT.read_text(encoding="utf-8") != script_text:
            raise SystemExit("src/terrain-data.js is stale")
    else:
        OUTPUT.write_text(data_text, encoding="utf-8")
        SCRIPT_OUTPUT.write_text(script_text, encoding="utf-8")
    total = sum(line["lengthMetres"] for line in result["lines"])
    print(json.dumps({"lines": result["lineCounts"], "lengthMetres": round(total, 1),
                      "sourceMapHash": result["sourceMapHash"], "checked": args.check}, ensure_ascii=False))


if __name__ == "__main__":
    main()
