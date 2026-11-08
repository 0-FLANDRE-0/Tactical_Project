#!/usr/bin/env python3
"""Build the small transparent WIP12 effect atlas with Python stdlib only."""
from pathlib import Path
import math, struct, zlib

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/effects/wip12-effects-atlas.png'
W, H, CELL = 256, 64, 64
pixels = bytearray(W * H * 4)

def blend(x, y, rgb, alpha):
    if not (0 <= x < W and 0 <= y < H) or alpha <= 0:
        return
    i = (y * W + x) * 4
    old = pixels[i + 3] / 255
    a = max(0, min(1, alpha))
    out = a + old * (1 - a)
    if out <= 0:
        return
    for c in range(3):
        pixels[i + c] = round((rgb[c] * a + pixels[i + c] * old * (1 - a)) / out)
    pixels[i + 3] = round(out * 255)

def glow(cx, cy, radius, inner, outer, power=2):
    for y in range(max(0, int(cy-radius)), min(H, int(cy+radius)+1)):
        for x in range(max(0, int(cx-radius)), min(W, int(cx+radius)+1)):
            d = math.hypot(x+.5-cx, y+.5-cy) / radius
            if d < 1:
                t = d ** power
                blend(x, y, tuple(round(inner[i]*(1-t)+outer[i]*t) for i in range(3)), (1-d)**1.6)

# 0: muzzle flash. Radial petals plus a white-hot centre.
glow(32, 32, 21, (255, 252, 214), (246, 133, 43), 1.5)
for ray in range(12):
    a = ray * math.pi / 6
    length = 18 + (ray % 3) * 5
    for step in range(7, int(length)):
        x = round(32 + math.cos(a) * step)
        y = round(32 + math.sin(a) * step)
        blend(x, y, (255, 192, 75), .65 * (1-step/length))

# 1: smoke/dust puff.
for cx, cy, radius, colour, alpha in [
    (91,34,20,(112,111,101),.48),(108,29,17,(143,132,111),.44),
    (121,38,16,(104,106,99),.38),(101,43,14,(158,143,115),.34)]:
    for y in range(int(cy-radius), int(cy+radius)+1):
        for x in range(int(cx-radius), int(cx+radius)+1):
            d=math.hypot(x+.5-cx,y+.5-cy)/radius
            if d<1: blend(x,y,colour,alpha*(1-d*d)**1.8)

# 2: impact sparks. Transparent rays with a compact impact core.
glow(160, 32, 12, (255,255,230), (255,146,37), 1.2)
for ray in range(18):
    a = ray * 2*math.pi/18 + .17
    length = 13 + ((ray*7) % 18)
    for step in range(8, length):
        blend(round(160+math.cos(a)*step), round(32+math.sin(a)*step),
              (255, 218 if ray%2 else 166, 78), .9*(1-step/length))

# 3: tracer streak, drawn horizontally and rotated by Canvas.
for y in range(20,45):
    for x in range(195,253):
        along=(x-195)/58
        across=abs(y+.5-32)/12.5
        if across<1:
            alpha=(along**1.8)*(1-across)**2
            colour=(255, round(190+65*along), round(86+153*along))
            blend(x,y,colour,alpha)

def chunk(kind, data):
    return struct.pack('>I', len(data))+kind+data+struct.pack('>I', zlib.crc32(kind+data)&0xffffffff)

raw = b''.join(b'\x00'+bytes(pixels[y*W*4:(y+1)*W*4]) for y in range(H))
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', W,H,8,6,0,0,0)) + chunk(b'IDAT', zlib.compress(raw,9)) + chunk(b'IEND', b'')
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_bytes(png)
print(f'Built {OUT.relative_to(ROOT)} ({len(png)} bytes, RGBA {W}x{H})')
