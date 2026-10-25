"""
Tilts the celebration camera down a few degrees, so the ground (and his contact
shadow on it) reads, and saves the file.

  blender -b scripts/celebration/shifu3d_v3.blend --python scripts/celebration/blender/camera.py
"""
import math

import bpy

TILT = 6  # degrees below level
cam = bpy.data.objects["ShifuCam"]
dist = 12.0
centre_z = 2.05
cam.rotation_euler = (math.radians(90 - TILT), 0, 0)
cam.location = (0, -dist * math.cos(math.radians(TILT)), centre_z + dist * math.sin(math.radians(TILT)))
bpy.ops.wm.save_mainfile(compress=True)
print("CAMERA", tuple(round(v, 3) for v in cam.location))
