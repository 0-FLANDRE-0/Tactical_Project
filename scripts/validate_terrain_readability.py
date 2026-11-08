#!/usr/bin/python3
"""Record cross-profile evidence for the baked ridge/valley interpretation."""
from pathlib import Path
import importlib.util
import json
import math
import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("terrain_builder", ROOT / "scripts/build_terrain_readability.py")
builder = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(builder)
source = json.loads((ROOT / "data/rasdorf_4km.json").read_text())
derived = json.loads((ROOT / "data/terrain-readability.json").read_text())
raw = builder.decode_heights(source)
grid = builder.downsample_mean(raw, source["heightmap"]["spacing"], derived["analysisSpacingMetres"])
smooth = gaussian_filter(grid, derived["smoothingSigmaMetres"] / derived["analysisSpacingMetres"], mode="nearest")
waterway_points = np.asarray([point for line in source["features"]["waterways"] if not line.get("culvert") for point in line["points"]])
zones = [
    {"id": "west-forest-ridge", "centre": [800, 1500], "halfSize": [600, 450]},
    {"id": "open-hill", "centre": [1000, 3400], "halfSize": [600, 450]},
    {"id": "rasdorf-slope", "centre": [2800, 1550], "halfSize": [600, 450]},
    {"id": "south-east-valley", "centre": [3250, 3250], "halfSize": [600, 450]},
]


def sample(array, x, y, spacing):
    return float(map_coordinates(array, np.asarray([[y / spacing - .5], [x / spacing - .5]]), order=1, mode="nearest")[0])


def intersects(line, zone):
    x, y = zone["centre"]
    hx, hy = zone["halfSize"]
    a, b, c, d = line["bounds"]
    return a <= x + hx and c >= x - hx and b <= y + hy and d >= y - hy


def profile(line):
    points = line["points"]
    if len(points) == 2:
        before, after = np.asarray(points[0]), np.asarray(points[1])
        centre = (before + after) / 2
    else:
        index = max(1, min(len(points) - 2, len(points) // 2))
        before, centre, after = np.asarray(points[index - 1]), np.asarray(points[index]), np.asarray(points[index + 1])
    tangent = after - before
    tangent = tangent / np.linalg.norm(tangent)
    perpendicular = np.asarray([-tangent[1], tangent[0]])
    offset = derived["crossSectionOffsetMetres"]
    left, right = centre + perpendicular * offset, centre - perpendicular * offset
    smoothed = [sample(smooth, *point, derived["analysisSpacingMetres"]) for point in (left, centre, right)]
    original = [sample(raw, *point, source["heightmap"]["spacing"]) for point in (left, centre, right)]
    signed = ((smoothed[0] + smoothed[2]) / 2 - smoothed[1]) * (1 if line["kind"] == "valley" else -1)
    water_distance = float(np.sqrt(((waterway_points - centre) ** 2).sum(axis=1)).min())
    return {"kind": line["kind"], "point": [round(float(v), 2) for v in centre],
            "leftCentreRightSmoothedMetres": [round(v, 3) for v in smoothed],
            "leftCentreRightOriginalMetres": [round(v, 3) for v in original],
            "signedCrossReliefMetres": round(signed, 3),
            "contourBracketMetres": [math.floor(smoothed[1] / 10) * 10, math.ceil(smoothed[1] / 10) * 10],
            "nearestMappedWaterwayMetres": round(water_distance, 1),
            "mappedWaterwayWithin40Metres": water_distance <= 40,
            "lineLengthMetres": line["lengthMetres"], "lineStoredSupportMetres": line["crossReliefMetres"]}


evidence = []
zone_results = []
for zone in zones:
    candidates = [line for line in derived["lines"] if intersects(line, zone)]
    counts = {kind: sum(line["kind"] == kind for line in candidates) for kind in ("ridge", "valley")}
    selected = []
    for kind in ("ridge", "valley"):
        options = [line for line in candidates if line["kind"] == kind]
        if options:
            selected.append(max(options, key=lambda line: (line["lengthMetres"], line["crossReliefMetres"])))
    profiles = [profile(line) for line in selected]
    if any(item["signedCrossReliefMetres"] <= 0 for item in profiles):
        raise SystemExit("cross profile classification failed in " + zone["id"])
    evidence.extend(profiles)
    zone_results.append({**zone, "lineCounts": counts, "profiles": profiles})

valley_water_distances = []
for line in (item for item in derived["lines"] if item["kind"] == "valley"):
    points = np.asarray(line["points"])
    # A display valley may be wet or dry; proximity is evidence, not a selection input.
    distance = min(float(np.sqrt(((waterway_points - point) ** 2).sum(axis=1)).min()) for point in points[::max(1, len(points)//8)])
    valley_water_distances.append(distance)
wet = sum(distance <= 40 for distance in valley_water_distances)
dry = sum(distance > 100 for distance in valley_water_distances)
if not wet or not dry:
    raise SystemExit("expected both mapped-water and dry valley examples")

report = {
    "version": "0.4-WIP11D", "sourceMapHash": derived["sourceMapHash"],
    "method": {key: derived[key] for key in ["algorithm", "algorithmVersion", "analysisSpacingMetres", "smoothingSigmaMetres", "flowAccumulationCells", "crossSectionOffsetMetres", "minimumCrossReliefMetres", "minimumLengthMetres", "boundaryMarginMetres"]},
    "lineCounts": derived["lineCounts"], "zones": zone_results,
    "profileCount": len(evidence), "allProfilesMatchKind": True,
    "valleyWaterwayContext": {"mappedWithin40Metres": wet, "dryBeyond100Metres": dry,
                               "note": "Mapped-water proximity is reported after extraction and is not an extraction criterion or ground truth."},
    "limits": ["20 m analysis and 40 m Gaussian sigma intentionally omit narrow micro-relief",
               "D8/inverted-D8 centre lines may omit broad flat divides and closed depressions",
               "Interpretation vectors are display-only and never feed movement, LOS, collision, or path finding"],
}
(ROOT / "tests/releases/WIP11D-terrain-analysis.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"profiles": len(evidence), "wetValleys": wet, "dryValleys": dry, "zones": len(zones)}))
