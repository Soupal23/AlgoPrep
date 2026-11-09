import os
import numpy as np
from PIL import Image
from collections import deque

src_path = r'C:/Users/DELL/.gemini/antigravity/brain/54558b29-6d3e-4c5b-9e00-b2f730db92af/.user_uploaded/media_1794209829489_23881bac.jpg'
out_dir = r'C:/Users/DELL/Desktop/AlgoPrep/client/public'
os.makedirs(out_dir, exist_ok=True)

img = Image.open(src_path).convert('RGB')
arr = np.array(img, dtype=np.float32)
h, w, _ = arr.shape
brightness = np.max(arr, axis=2)

# BFS to mark definite exterior background
is_bg = np.zeros((h, w), dtype=bool)
q = deque()

for r in range(h):
    for c in (0, w-1):
        if brightness[r, c] < 12 and not is_bg[r, c]:
            is_bg[r, c] = True
            q.append((r, c))

for c in range(w):
    for r in (0, h-1):
        if brightness[r, c] < 12 and not is_bg[r, c]:
            is_bg[r, c] = True
            q.append((r, c))

while q:
    r, c = q.popleft()
    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < h and 0 <= nc < w:
            if not is_bg[nr, nc] and brightness[nr, nc] < 15:
                is_bg[nr, nc] = True
                q.append((nr, nc))

# Soft alpha ramp for outer edges
alpha = np.ones((h, w), dtype=np.float32) * 255.0
alpha[is_bg] = 0.0

for r in range(1, h-1):
    for c in range(1, w-1):
        if not is_bg[r, c] and brightness[r, c] < 45:
            if is_bg[r-1, c] or is_bg[r+1, c] or is_bg[r, c-1] or is_bg[r, c+1]:
                alpha[r, c] = min(255.0, (brightness[r, c] / 45.0) * 255.0)

alpha_uint8 = np.clip(alpha, 0, 255).astype(np.uint8)
rgba = np.dstack([arr.astype(np.uint8), alpha_uint8])
full_rgba = Image.fromarray(rgba, mode='RGBA')

# 1. Full logo cropped to bounds with a slight margin
crop_x1, crop_y1, crop_x2, crop_y2 = 45, 95, 975, 375
full_logo = full_rgba.crop((crop_x1, crop_y1, crop_x2, crop_y2))
full_logo.save(os.path.join(out_dir, 'logo.png'), format='PNG', optimize=True)
print('Saved logo.png:', full_logo.size)

# 2. Mascot icon (square 512x512)
mascot_sq = full_rgba.crop((27, 54, 389, 416))
mascot_512 = mascot_sq.resize((512, 512), Image.Resampling.LANCZOS)
mascot_512.save(os.path.join(out_dir, 'logo-icon.png'), format='PNG', optimize=True)
print('Saved logo-icon.png: 512x512')

# 3. Favicon (ico: 16, 32, 48)
mascot_512.save(os.path.join(out_dir, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
print('Saved favicon.ico')

# 4. Apple touch icon (180x180) with dark background so it looks great on iOS
apple_touch = Image.new('RGBA', (180, 180), (9, 9, 11, 255))
mascot_160 = mascot_sq.resize((150, 150), Image.Resampling.LANCZOS)
apple_touch.paste(mascot_160, (15, 15), mascot_160)
apple_touch.convert('RGB').save(os.path.join(out_dir, 'apple-touch-icon.png'), format='PNG')
print('Saved apple-touch-icon.png')

# 5. OpenGraph preview image (1200x630)
og_img = Image.new('RGBA', (1200, 630), (9, 9, 11, 255))
aspect = full_logo.width / full_logo.height
og_w = 850
og_h = int(og_w / aspect)
full_scaled = full_logo.resize((og_w, og_h), Image.Resampling.LANCZOS)
pos_x = (1200 - og_w) // 2
pos_y = (630 - og_h) // 2
og_img.paste(full_scaled, (pos_x, pos_y), full_scaled)
og_img.convert('RGB').save(os.path.join(out_dir, 'og-image.png'), format='PNG')
print('Saved og-image.png')

# 6. Favicon SVG wrapper
svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="100" fill="#09090b"/>
  <image href="/logo-icon.png" x="26" y="26" width="460" height="460"/>
</svg>"""
with open(os.path.join(out_dir, 'favicon.svg'), 'w', encoding='utf-8') as f:
    f.write(svg_content)
print('Saved favicon.svg')
