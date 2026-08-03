#!/usr/bin/env python3
# 生成 codexU-web 应用图标 build/icon.png (512x512) —— 深蓝渐变底 + 金色闪电
import zlib, struct, os

W = H = 512

def px(x, y):
    # 背景：深蓝渐变
    t = y / H
    r = int(13 + 20 * (1 - t))
    g = int(22 + 30 * (1 - t))
    b = int(42 + 40 * (1 - t))
    # 圆角裁切
    cx, cy, rad = W / 2, H / 2, W / 2 - 8
    if (x - cx) ** 2 + (y - cy) ** 2 > rad * rad:
        return (0, 0, 0, 0)
    # 闪电多边形（相对坐标，中心 256,256）
    poly = [
        (0.30, 0.20, 0.20, 0.52), (0.46, 0.52, 0.42, 0.52), (0.40, 0.80, 0.44, 0.80),
        (0.72, 0.46, 0.56, 0.46), (0.62, 0.46, 0.58, 0.46), (0.66, 0.18, 0.50, 0.18),
    ]
    # 简化：闪电 = 两个梯形组合
    # 上段：从 (0.30,0.18) 到 (0.62,0.18) 再到窄口 (0.46,0.52)
    # 下段：从 (0.56,0.52) 到 (0.66,0.80) 窄口
    in_upper = False
    in_lower = False
    # 上段梯形
    if 0.18 <= y / H <= 0.52:
        yy = y / H
        xleft = 0.30 + (0.46 - 0.30) * ((yy - 0.18) / (0.52 - 0.18)) - 0.045
        xright = 0.62 + (0.50 - 0.62) * ((yy - 0.18) / (0.52 - 0.18)) + 0.045
        if xleft <= x / W <= xright:
            in_upper = True
    if 0.52 < y / H <= 0.80:
        yy = y / H
        xleft = 0.42 + (0.44 - 0.42) * ((yy - 0.52) / (0.28)) - 0.05
        xright = 0.56 + (0.66 - 0.56) * ((yy - 0.52) / (0.28)) + 0.05
        if xleft <= x / W <= xright:
            in_lower = True
    if in_upper or in_lower:
        return (250, 204, 21, 255)  # 金色
    return (r, g, b, 255)

rows = []
for y in range(H):
    row = bytearray([0])  # filter type 0
    for x in range(W):
        row.extend(px(x, y))
    rows.append(bytes(row))

raw = b''.join(rows)

def chunk(typ, data):
    c = struct.pack('>I', len(data)) + typ + data
    c += struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)
    return c

png = b'\x89PNG\r\n\x1a\n'
png += chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 6, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(raw, 9))
png += chunk(b'IEND', b'')

os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'build'), exist_ok=True)
out = os.path.join(os.path.dirname(__file__), '..', 'build', 'icon.png')
with open(out, 'wb') as f:
    f.write(png)
print('icon written:', out, os.path.getsize(out), 'bytes')
