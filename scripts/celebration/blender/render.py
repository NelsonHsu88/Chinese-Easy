"""
Renders the celebration animation from shifu3d_v3.blend to transparent PNG frames.

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b scripts/celebration/shifu3d_v3.blend \
      --python scripts/celebration/blender/render.py -- <out_dir> [first] [last] [step]

The cloth is simulated from frame 1 whatever `first` is, so the fabric has
settled before the first rendered frame.
"""
import os
import sys
import time

import bpy

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out_dir = argv[0] if argv else os.path.join(os.path.dirname(bpy.data.filepath), "frames")
first = int(argv[1]) if len(argv) > 1 else 40
last = int(argv[2]) if len(argv) > 2 else bpy.context.scene.frame_end
step = int(argv[3]) if len(argv) > 3 else 1
os.makedirs(out_dir, exist_ok=True)

scene = bpy.context.scene
r = scene.render
r.film_transparent = True
r.image_settings.file_format = 'PNG'
r.image_settings.color_mode = 'RGBA'
r.resolution_x, r.resolution_y, r.resolution_percentage = 900, 1100, 100

t0 = time.time()
for f in range(1, last + 1):
    scene.frame_set(f)
    if f >= first and (f - first) % step == 0:
        r.filepath = os.path.join(out_dir, f"f{f:04d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"FRAME {f} {time.time() - t0:.0f}s", flush=True)
print("DONE", flush=True)
