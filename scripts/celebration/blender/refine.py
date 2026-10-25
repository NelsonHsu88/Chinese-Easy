"""
Turns shifu3d_v3.blend into shifu3d_v4.blend: one seamless surface per part,
and eyes that open, blink, look and squeeze shut when he laughs.

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b scripts/celebration/shifu3d_v3.blend \
      --python scripts/celebration/blender/refine.py

1. Seamless parts. Pieces that were stuck together (every hair lock on the
   cap, the three strokes of each brow, the fingers on a hand...) are merged,
   voxel-remeshed into one closed surface and relaxed, the way a sculptor
   would fuse blockout pieces. Everything else gets enough subdivision that
   no silhouette or shading terminator shows a facet.
2. Eyes. Glossy bean eyes with two catchlights, set on the head's surface.
   Blinks and the happy squint squash the eye to a line and hand over to the
   old closed-eye arcs, so the swap is invisible.
"""
import math
import os

import bmesh
import bpy
from mathutils import Matrix, Vector

SCENE = bpy.context.scene
COL = bpy.data.collections["Shifu"]
OUTLINE = bpy.data.materials["W_outline"]
SCENE.frame_set(1)


def dg():
    return bpy.context.evaluated_depsgraph_get()


def is_outline(m):
    return m.type == 'SOLIDIFY' and m.use_flip_normals


# ── 1. Fuse groups into one seamless surface ───────────────────────────────
def baked_mesh(o):
    """The object's evaluated geometry without its outline shell."""
    hidden = []
    for m in getattr(o, "modifiers", []):
        if is_outline(m) and m.show_viewport:
            m.show_viewport = False
            hidden.append(m)
    eo = o.evaluated_get(dg())
    me = bpy.data.meshes.new_from_object(eo)
    for m in hidden:
        m.show_viewport = True
    return me


def fuse(name, parts, voxel, smooth=4, outline=True, outline_scale=1.0):
    parts = [bpy.data.objects[p] for p in parts if p in bpy.data.objects]
    target = parts[0]
    base_mat = next(m for m in (target.data.materials if target.type == 'MESH' else target.data.materials)
                    if m and m is not OUTLINE)
    outline_th = next((m.thickness for p in parts for m in getattr(p, "modifiers", []) if is_outline(m)), 0.008)
    # Work at true size: voxel sizes are in metres, whatever the parts' scale.
    loc, rot, _ = target.matrix_world.decompose()
    frame = Matrix.LocRotScale(loc, rot, None)
    inv = frame.inverted()

    bm = bmesh.new()
    for p in parts:
        me = baked_mesh(p)
        me.transform(inv @ p.matrix_world)
        bm.from_mesh(me)
        bpy.data.meshes.remove(me)
    joined = bpy.data.meshes.new(name + "_joined")
    bm.to_mesh(joined)
    bm.free()

    tmp = bpy.data.objects.new(name + "_tmp", joined)
    COL.objects.link(tmp)
    tmp.matrix_world = frame
    r = tmp.modifiers.new("Remesh", 'REMESH')
    r.mode, r.voxel_size, r.adaptivity, r.use_smooth_shade = 'VOXEL', voxel, 0.0, True
    if smooth:
        s = tmp.modifiers.new("Relax", 'CORRECTIVE_SMOOTH')
        s.smooth_type, s.iterations, s.factor, s.use_only_smooth = 'SIMPLE', smooth, 0.5, True
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg()))
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.meshes.remove(joined)

    parent, mw = target.parent, frame
    for p in parts:
        bpy.data.objects.remove(p, do_unlink=True)
    me.name = name
    for poly in me.polygons:
        poly.use_smooth = True
    me.materials.clear()
    me.materials.append(base_mat)
    o = bpy.data.objects.new(name, me)
    COL.objects.link(o)
    o.parent = parent
    o.matrix_world = mw
    if outline:
        me.materials.append(OUTLINE)
        m = o.modifiers.new("Outline", 'SOLIDIFY')
        m.thickness, m.offset, m.use_flip_normals = outline_th * outline_scale, 1.0, True
        m.material_offset, m.use_even_offset = 1, False
    print(f"FUSED {name}: {len(parts)} parts -> {len(me.polygons)} faces")
    return o


hair_parts = (["HairCap", "Hairline", "SideLockL", "SideLockR", "Bun", "BunWind"]
              + [f"HairLock{i}" for i in range(17)])
# Hair and beard: relaxed hard and drawn with a finer line, so the inverted-hull
# outline stays on the silhouette instead of showing in every groove as a crack.
fuse("Hair", hair_parts, voxel=0.009, smooth=14, outline_scale=0.55)
fuse("BrowL", [f"BrowL{i}" for i in range(3)], voxel=0.006, smooth=8, outline=False)
fuse("BrowR", [f"BrowR{i}" for i in range(3)], voxel=0.006, smooth=8, outline=False)
fuse("Moustache", ["MoustacheL", "MoustacheR"], voxel=0.007, smooth=6)
fuse("Beard", ["Beard", "BeardLock0", "BeardLock1", "BeardLock2"], voxel=0.008, smooth=12, outline_scale=0.6)
fuse("HandR", ["HandR", "FingerR0", "FingerR1", "FingerR2"], voxel=0.005)
fuse("FistL", ["FistL", "KnuckleL0", "KnuckleL1", "KnuckleL2", "ThumbL"], voxel=0.005)
fuse("ShoeR", ["ShoeR", "ShoeToeR"], voxel=0.006)
fuse("LegL", ["ThighL", "ShinL"], voxel=0.008)
fuse("Bow", ["BowKnot", "BowLoopUp", "BowLoopDn"], voxel=0.005)


# ── 2. Enough subdivision everywhere else ─────────────────────────────────
SKIP = {"ContactShadow", "BlushL", "BlushR", "EarInL", "EarInR"}
for o in list(COL.objects):
    if o.type == 'CURVE':
        o.data.bevel_resolution = max(o.data.bevel_resolution, 8)
        o.data.resolution_u = max(o.data.resolution_u, 24)
        o.data.use_fill_caps = True
        continue
    if o.type != 'MESH' or o.name in SKIP or any(m.type == 'REMESH' for m in o.modifiers):
        continue
    if o.name in ("Hair", "BrowL", "BrowR", "Moustache", "Beard", "HandR", "FistL", "ShoeR", "LegL", "Bow"):
        continue
    sub = next((m for m in o.modifiers if m.type == 'SUBSURF'), None)
    if sub is None:
        sub = o.modifiers.new("Smooth", 'SUBSURF')
        # Before the thickness / outline shells, after any cloth.
        idx = next((i for i, m in enumerate(o.modifiers) if m.type == 'SOLIDIFY'), len(o.modifiers) - 1)
        o.modifiers.move(o.modifiers.find(sub.name), idx)
    low = len(o.data.polygons) < 400
    sub.levels = 2
    sub.render_levels = 3 if low else 2
    sub.quality = 3
    for p in o.data.polygons:
        p.use_smooth = True
    print(f"SUBDIV {o.name}: {len(o.data.polygons)} faces, render level {sub.render_levels}")


# ── 3. Eyes ────────────────────────────────────────────────────────────────
def mat_eye():
    m = bpy.data.materials.get("W_eye") or bpy.data.materials.new("W_eye")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    # Warm brown iris glow low in the eye, near-black above: reads as depth.
    e[0].position, e[0].color = 0.0, (0.20, 0.11, 0.06, 1)
    e[1].position, e[1].color = 0.62, (0.025, 0.022, 0.03, 1)
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], em.inputs[0])
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def mat_glint():
    m = bpy.data.materials.get("W_glint") or bpy.data.materials.new("W_glint")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs[0].default_value = (1, 1, 1, 1)
    nt.links.new(em.outputs[0], out.inputs[0])
    return m


def ellipsoid(name, mat, segs=48, rings=24):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me)
    COL.objects.link(o)
    return o


EYE_MAT, GLINT_MAT = mat_eye(), mat_glint()
head = bpy.data.objects["Head"]
pivot_head = bpy.data.objects["Pivot_Head"]
head_eval = head.evaluated_get(dg())
head_inv = head.matrix_world.inverted()
EYE_W, EYE_H, EYE_D = 0.068, 0.092, 0.034   # half-sizes: a tall, friendly bean
eyes = {}
for side, sx in (("L", 1), ("R", -1)):
    old = bpy.data.objects.get(f"EyeOpen{side}")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    centre = Vector((0.215 * sx, -2.0, 2.305))
    hit, loc, nrm, _ = head_eval.ray_cast(head_inv @ centre, head_inv.to_3x3() @ Vector((0, 1, 0)))
    assert hit, "eye ray missed the head"
    p = head.matrix_world @ loc
    n = (head.matrix_world.to_3x3() @ nrm).normalized()
    if n.y > 0:   # the ray meets the outline shell, whose normals face inward
        n = -n
    y = -n                                                       # local +Y into the head, like Blender's front view
    x = Vector((1, 0, 0)) - y * y.x
    x.normalize()
    z = x.cross(y)
    rig = bpy.data.objects.new(f"EyeRig{side}", None)
    COL.objects.link(rig)
    rig.empty_display_size = 0.05
    rig.matrix_world = Matrix.LocRotScale(p + n * 0.006, Matrix((x, y, z)).transposed().to_quaternion(), None)
    rig.parent = pivot_head
    rig.matrix_parent_inverse = pivot_head.matrix_world.inverted()

    eye = ellipsoid(f"EyeOpen{side}", EYE_MAT)
    eye.parent = rig
    eye.scale = (EYE_W, EYE_D, EYE_H)
    # Catchlights sit on the front of the bean, upper outer and lower inner,
    # the same on both eyes (one light, one world).
    for gname, (gx, gz, r) in (("GlintBig", (-0.34, 0.38, 0.30)), ("GlintSmall", (0.36, -0.40, 0.14))):
        g = ellipsoid(f"{gname}{side}", GLINT_MAT, 24, 12)
        g.parent = eye
        gy = -math.sqrt(max(0.0, 1 - gx * gx - gz * gz)) * 1.04
        g.location = (gx, gy, gz)
        g.scale = (r, r * 0.5, r * EYE_W / EYE_H)
    eyes[side] = eye
    print(f"EYE {side} at {tuple(round(c, 3) for c in p)} normal {tuple(round(c, 2) for c in n)}")


# ── 4. Eye, brow and arc animation ─────────────────────────────────────────
def key(o, f, **kw):
    for path, val in kw.items():
        setattr(o, path, val)
        o.keyframe_insert(path, frame=f)


# Openness 1 = open, 0.06 = shut line; then the arc takes over.
OPEN = [  # (frame, openness, gaze x, gaze z) — gaze in rig space, a few mm
    (1, 1.0, 0, 0), (40, 1.0, 0, 0),
    (47, 1.0, 0, 0), (49, 0.06, 0, -0.004), (52, 1.0, 0, 0),           # settle-in blink
    (60, 0.92, 0, -0.008), (70, 0.72, 0, -0.012),                        # crouch: focus, look down
    (76, 1.12, 0, 0.012), (86, 1.08, 0, 0.014),                          # lift-off: wide, look up
    (126, 1.05, 0, 0.004), (138, 1.0, 0, -0.01),                         # spotting the landing
    (145, 0.5, 0, -0.006), (148, 0.06, 0, 0),                            # impact squeeze
    (176, 0.06, 0, 0), (180, 1.06, 0, 0.004), (186, 1.0, 0, 0),          # laugh ends, pop open
    (200, 1.0, -0.006, 0), (212, 1.0, 0.006, 0.002),                     # a glance across
    (214, 1.0, 0.006, 0.002), (216, 0.06, 0.003, 0), (219, 1.0, 0, 0),   # blink
    (232, 1.0, 0, 0),
]
for side in ("L", "R"):
    eye = eyes[side]
    for f, op, gx, gz in OPEN:
        key(eye, f, scale=(EYE_W * (1 + 0.12 * (1 - min(op, 1))), EYE_D, EYE_H * op),
            location=(gx, 0, gz - 0.25 * EYE_H * (1 - min(op, 1))))   # lid comes down from the top

# The closed-eye arcs show only while the eye is shut for the laugh.
for side in ("L", "R"):
    arc = bpy.data.objects[f"Eye{side}"]
    arc.animation_data_clear()
    a0 = arc.scale.copy()
    for f, s in ((1, 0.0), (147, 0.0), (150, 1.0), (175, 1.0), (178, 0.0), (232, 0.0)):
        key(arc, f, scale=(a0.x, a0.y, a0.z * max(s, 0.001)))
    for f, hide in ((1, True), (147, False), (178, True)):
        arc.hide_render = hide
        arc.keyframe_insert("hide_render", frame=f)
    for f, hide in ((147, True), (178, False)):
        eye = eyes[side]
        for o in [eye] + list(eye.children):
            o.hide_render = hide
            o.keyframe_insert("hide_render", frame=f)
    for o in [eyes[side]] + list(eyes[side].children):
        o.hide_render = False
        o.keyframe_insert("hide_render", frame=1)

# Brows: knit on the crouch, shoot up on lift-off, lift with the laugh.
for side, sx in (("L", 1), ("R", -1)):
    b = bpy.data.objects[f"Brow{side}"]
    b.animation_data_clear()
    base = b.location.copy() + Vector((0, 0, 0.022))   # sit higher: open, kind, not worried
    for f, dz, tilt in ((1, 0, 0), (58, 0, 0), (70, -0.025, -6), (78, 0.022, 5), (100, 0.016, 3), (138, 0.0, 0),
                        (148, -0.015, 0), (156, 0.02, 6), (176, 0.012, 3), (186, 0, 0), (232, 0, 0)):
        key(b, f, location=(base.x, base.y, base.z + dz))
        b.rotation_euler = (0, math.radians(tilt * sx), 0)
        b.keyframe_insert("rotation_euler", frame=f)


def fcurves(o):
    act = o.animation_data.action if o.animation_data else None
    if not act:
        return []
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    return [c for layer in act.layers for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves]


for o in list(eyes.values()) + [bpy.data.objects[n] for n in ("BrowL", "BrowR", "EyeL", "EyeR")]:
    for c in fcurves(o):
        for kp in c.keyframe_points:
            if c.data_path == "hide_render":
                kp.interpolation = 'CONSTANT'
            else:
                kp.interpolation = 'BEZIER'
                kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'

out = os.path.join(os.path.dirname(bpy.data.filepath), "shifu3d_v4.blend")
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("SAVED", out)
