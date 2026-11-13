import json
import subprocess
import tempfile
import unittest
from pathlib import Path

import numpy as np
from osgeo import gdal, osr

gdal.UseExceptions()

ROOT = Path(__file__).resolve().parents[1]
BOUNDS = [500000, 5600000, 500032, 5600032]


class BattlefieldDemValidationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='tactical-wip17-dem-')
        self.root = Path(self.temp.name)
        (self.root / 'osm.json').write_text('{"elements":[]}', encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def make_dem(self, name, width=32, height=32, *, nodata=None, invalid=False, epsg=25832, projection=True):
        path = self.root / name
        data = np.zeros((height, width), dtype=np.float32) if nodata is None else np.full((height, width), 100, dtype=np.float32)
        if invalid:
            data[8:16, 8:16] = nodata
        dataset = gdal.GetDriverByName('GTiff').Create(str(path), width, height, 1, gdal.GDT_Float32)
        dataset.SetGeoTransform((BOUNDS[0], 1, 0, BOUNDS[3], 0, -1))
        if projection:
            spatial = osr.SpatialReference(); spatial.ImportFromEPSG(epsg); dataset.SetProjection(spatial.ExportToWkt())
        band = dataset.GetRasterBand(1)
        if nodata is not None:
            band.SetNoDataValue(nodata)
        band.WriteArray(data); band.FlushCache(); dataset = None
        return path

    def run_build(self, dem):
        config = {
            'id': 'synthetic-dem-validation', 'name': 'SYNTHETIC', 'subtitle': 'DEM 검사', 'epsg': 25832,
            'bounds': BOUNDS, 'dem': str(dem), 'osm': str(self.root / 'osm.json'),
            'output': str(self.root / 'map.json'), 'scriptOutput': str(self.root / 'map.js'),
            'manifestOutput': str(self.root / 'manifest.json'), 'overviewOutput': str(self.root / 'overview.png'),
            'overviewLabels': []
        }
        config_path = self.root / 'config.json'; config_path.write_text(json.dumps(config), encoding='utf-8')
        return subprocess.run(['/usr/bin/python3', str(ROOT / 'scripts/build_battlefield.py'), '--config', str(config_path)], cwd=ROOT, text=True, capture_output=True)

    def test_uncovered_request_fails_even_without_a_nodata_tag(self):
        result = self.run_build(self.make_dem('partial.tif', 16, 16))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('does not cover the requested bounds', result.stderr)

    def test_nodata_zero_region_fails_by_mask_not_elevation_value(self):
        result = self.run_build(self.make_dem('masked-zero.tif', nodata=0, invalid=True))
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('contains NoData inside the requested bounds', result.stderr)

    def test_valid_zero_elevation_without_nodata_metadata_passes(self):
        result = self.run_build(self.make_dem('valid-zero.tif'))
        self.assertEqual(result.returncode, 0, result.stderr)
        built = json.loads((self.root / 'map.json').read_text(encoding='utf-8'))
        self.assertEqual(built['meta']['heightRange'], [0.0, 0.0])

    def test_missing_or_mismatched_source_crs_is_rejected(self):
        missing = self.run_build(self.make_dem('missing-crs.tif', projection=False))
        self.assertNotEqual(missing.returncode, 0); self.assertIn('source CRS is missing', missing.stderr)
        mismatch = self.run_build(self.make_dem('mismatch-crs.tif', epsg=32632))
        self.assertNotEqual(mismatch.returncode, 0); self.assertIn('does not match configured EPSG:25832', mismatch.stderr)


if __name__ == '__main__':
    unittest.main()
