#!/usr/bin/python3
import hashlib
import importlib.util
import json
import math
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("terrain_builder", ROOT / "scripts/build_terrain_readability.py")
terrain = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(terrain)


class TerrainReadabilityTests(unittest.TestCase):
    synthetic = {
        "flowAccumulationCells": 80,
        "smoothingSigmaMetres": 30,
        "crossSectionOffsetMetres": 40,
        "crossReliefPercentile": 30,
        "minimumCrossReliefMetres": .1,
        "minimumLengthMetres": 60,
        "boundaryMarginMetres": 40,
        "simplifyToleranceMetres": 3,
    }

    @staticmethod
    def surface(function, size=101, spacing=20):
        axis = (np.arange(size) - size // 2) * spacing
        x, y = np.meshgrid(axis, axis)
        return function(x, y).astype(np.float32)

    def lines(self, surface):
        return terrain.derive_from_grid(surface, 20, self.synthetic)

    def test_flat_slope_and_small_noise_do_not_form_false_networks(self):
        flat = self.surface(lambda x, y: x * 0 + 350)
        slope = self.surface(lambda x, y: 350 + x * .03 + y * .01)
        rng = np.random.default_rng(7)
        noise = flat + rng.normal(0, .04, flat.shape)
        for surface in (flat, slope, noise):
            self.assertEqual(self.lines(surface), [])

    def test_valley_and_ridge_are_not_reversed(self):
        valley = self.surface(lambda x, y: 330 + .0015 * x * x + .012 * y)
        ridge = self.surface(lambda x, y: 390 - .0015 * x * x + .012 * y)
        valley_lines, ridge_lines = self.lines(valley), self.lines(ridge)
        self.assertTrue(any(line["kind"] == "valley" for line in valley_lines))
        self.assertFalse(any(line["kind"] == "ridge" for line in valley_lines))
        self.assertTrue(any(line["kind"] == "ridge" for line in ridge_lines))
        self.assertFalse(any(line["kind"] == "valley" for line in ridge_lines))

    def test_rotated_valley_keeps_type_and_orientation(self):
        angle = math.radians(37)
        surface = self.surface(lambda x, y: 340 + .0013 * (x * math.cos(angle) + y * math.sin(angle)) ** 2
                                            + .01 * (-x * math.sin(angle) + y * math.cos(angle)))
        lines = [line for line in self.lines(surface) if line["kind"] == "valley"]
        self.assertTrue(lines)
        longest = max(lines, key=lambda line: line["lengthMetres"])
        start, end = np.asarray(longest["points"][0]), np.asarray(longest["points"][-1])
        direction = (end - start) / np.linalg.norm(end - start)
        expected = np.asarray([-math.sin(angle), math.cos(angle)])
        self.assertGreater(abs(float(direction @ expected)), .8)

    def test_saddle_contains_crossing_ridge_and_valley_support(self):
        saddle = self.surface(lambda x, y: 360 + .0012 * x * x - .0012 * y * y)
        kinds = {line["kind"] for line in self.lines(saddle)}
        self.assertEqual(kinds, {"ridge", "valley"})

    def test_boundary_margin_removes_edge_generated_lines(self):
        edge_valley = self.surface(lambda x, y: 340 + .0015 * (x + 900) ** 2 + .01 * y)
        lines = self.lines(edge_valley)
        margin = self.synthetic["boundaryMarginMetres"]
        size_metres = edge_valley.shape[0] * 20
        for line in lines:
            for x, y in line["points"]:
                self.assertGreaterEqual(x, margin)
                self.assertGreaterEqual(y, margin)
                self.assertLessEqual(x, size_metres - margin)
                self.assertLessEqual(y, size_metres - margin)

    def test_real_derivative_is_reproducible_and_source_bound(self):
        expected = json.loads((ROOT / "data/terrain-readability.json").read_text())
        actual = terrain.build()
        self.assertEqual(actual, expected)
        self.assertEqual(actual["sourceMapHash"], "ee48cd21b10d0911c5a401d6ba5388e9e28cb31773aedde134f8869af8954801")
        self.assertEqual(actual["lineCounts"], {"ridge": 47, "valley": 59})
        self.assertTrue(all(line["crossReliefMetres"] >= .5 for line in actual["lines"]))

    def test_original_map_manifest_and_battlefield_bytes_are_unchanged_and_contour_geometry_is_stable(self):
        expected = {
            "data/rasdorf_4km.json": "034b6749eccfe23ead935dd6d2db62fa0064e2eeb539a22b479638a9de0a87ce",
            # Only the WIP17 dimension signature was added; line geometry below is pinned separately.
            "data/contours.json": "866d45663cfdf627ec0678ec8ee3c25ec331d2c2ffdfb4d076c40b8258cf54fd",
            "data/map_manifest.json": "614cbc31d6e75654aad6194c7b376d5757db36386b2d8d8b0f4d9ad66abfee6a",
            "src/battlefield-data.js": "7a8891186d216f01effe70d41e146046575ebdd5132ba77562bcd496dd4c3cd7",
        }
        for name, digest in expected.items():
            self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), digest, name)
        contours = json.loads((ROOT / "data/contours.json").read_text())
        lines_hash = hashlib.sha256(json.dumps(contours["lines"], separators=(",", ":")).encode()).hexdigest()
        self.assertEqual(lines_hash, "d1682dc3d445c6992a103deb7bdcab6e1a21398b589b355d6eed9cb27c4986b2")


if __name__ == "__main__":
    unittest.main()
