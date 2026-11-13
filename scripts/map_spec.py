"""WIP17 map/derived-data dimensional contract for Python build tools."""
import math
LIMITS = {'width': 8000, 'height': 8000, 'height_cells': 16_000_000,
          'surface_cells': 4_000_000, 'navigation_cells': 250_000}

def _positive(value, name):
    if type(value) is not int or value <= 0:
        raise ValueError(f'{name} must be a positive integer')
    return value

def _encoded(value, name, minimum, maximum=None):
    maximum = minimum if maximum is None else maximum
    low, high = ((minimum + 2) // 3) * 4, ((maximum + 2) // 3) * 4
    if not isinstance(value, str) or len(value) < low or len(value) > high or len(value) % 4:
        raise ValueError(f'{name} encoded length is invalid')

def validate_map(data, *, require_navigation=False):
    if not isinstance(data, dict):
        raise ValueError('map data must be an object')
    meta = data.get('meta') or {}
    width, height = _positive(meta.get('width'), 'map width'), _positive(meta.get('height'), 'map height')
    if width > LIMITS['width'] or height > LIMITS['height']:
        raise ValueError('map dimensions exceed the WIP17 limit')
    if width % 16 or height % 16:
        raise ValueError('map dimensions must be divisible by 16m')
    if not isinstance(meta.get('id'), str) or not meta['id'].strip() or not isinstance(meta.get('mapHash'), str) or not meta['mapHash'].strip():
        raise ValueError('map id/hash is missing')
    grids = {}
    for key, spacing, limit in [('heightmap', 2, LIMITS['height_cells']), ('terrain', 4, LIMITS['surface_cells'])]:
        layer = data.get(key) or {}
        if layer.get('spacing') != spacing or layer.get('columns') != width // spacing or layer.get('rows') != height // spacing:
            raise ValueError(f'{key} dimensions do not match the map')
        cells = layer['columns'] * layer['rows']
        if cells > limit:
            raise ValueError(f'{key} is too large')
        grids[key] = {'columns': layer['columns'], 'rows': layer['rows'], 'spacing': spacing, 'cells': cells}
    _encoded(data['heightmap'].get('data'), 'heightmap', grids['heightmap']['cells'], grids['heightmap']['cells'] * 5)
    _encoded(data['terrain'].get('data'), 'terrain', grids['terrain']['cells'])
    if data['heightmap'].get('sampleOrigin') != 1 or data['heightmap'].get('encoding') != 'row-delta-zigzag-varint-base64':
        raise ValueError('unsupported heightmap contract')
    scale = data['heightmap'].get('scale')
    if isinstance(scale, bool) or not isinstance(scale, (int, float)) or not math.isfinite(scale) or scale <= 0:
        raise ValueError('heightmap scale must be finite and positive')
    features = data.get('features')
    if not isinstance(features, dict) or any(not isinstance(features.get(key), list) for key in
       ('roads', 'forests', 'fields', 'water', 'waterways', 'trees', 'labels', 'buildings')):
        raise ValueError('map feature arrays are missing')
    navigation = {'columns': width // 16, 'rows': height // 16, 'spacing': 16, 'cells': width // 16 * (height // 16)}
    if navigation['cells'] > LIMITS['navigation_cells']:
        raise ValueError('navigation grid is too large')
    nav = data.get('navigation')
    if require_navigation and not nav:
        raise ValueError('navigation cache is required')
    if nav and (nav.get('sourceHash') != meta['mapHash'] or nav.get('cols') != navigation['columns'] or nav.get('rows') != navigation['rows']):
        raise ValueError('navigation cache does not match the map')
    if nav:
        if not isinstance(nav.get('contract'), str) or not nav['contract']:
            raise ValueError('navigation contract is missing')
        _encoded(nav.get('costs'), 'navigation costs', navigation['cells'] * 4)
        _encoded(nav.get('edges'), 'navigation edges', navigation['cells'])
    return {'version': 1, 'id': meta['id'], 'hash': meta['mapHash'], 'width': width, 'height': height,
            'heightmap': grids['heightmap'], 'terrain': grids['terrain'], 'navigation': navigation}

def signature(spec):
    return {'version': 1, 'width': spec['width'], 'height': spec['height'],
            'heightColumns': spec['heightmap']['columns'], 'heightRows': spec['heightmap']['rows'], 'heightSpacing': 2,
            'surfaceColumns': spec['terrain']['columns'], 'surfaceRows': spec['terrain']['rows'], 'surfaceSpacing': 4,
            'navigationColumns': spec['navigation']['columns'], 'navigationRows': spec['navigation']['rows'], 'navigationSpacing': 16}

def validate_derived(spec, data, name, optional=False):
    if data is None:
        if optional: return False
        raise ValueError(f'{name} data is missing')
    if data.get('sourceMapHash') != spec['hash'] or data.get('mapSpec') != signature(spec):
        raise ValueError(f'{name} data does not match the selected map')
    return True
