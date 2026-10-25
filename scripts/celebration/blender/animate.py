"""
Rigs and animates the 3D Shifu in shifu3d_v2.blend for the celebration:
anticipation, jump, one full turn in the air, landing, and a happy beat.

Run headless (it saves shifu3d_v3.blend next to the source):
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b scripts/celebration/shifu3d_v2.blend \
      --python scripts/celebration/blender/animate.py

The motion follows the usual principles of character animation — squash and
stretch, anticipation, overlapping action (body, head and each arm on their
own pivots, each a beat behind the last), follow-through — and the cloth
(sleeves, skirt, ribbon and sash tails, beard tips) is simulated, so it trails
and settles on its own.
"""
import math
import os

import bpy
from mathutils import Matrix, Vector

SCENE = bpy.context.scene
COL = bpy.data.collections["Shifu"]
ROOT = bpy.data.objects["Shifu_Root"]
FPS = 60
END = 232

SCENE.render.fps = FPS
SCENE.frame_start, SCENE.frame_end = 1, END
SCENE.frame_set(1)


# ── Rig: pivots for body, head and arms ────────────────────────────────────
def pivot(name, loc, parent):
    e = bpy.data.objects.get(name) or bpy.data.objects.new(name, None)
    if e.name not in COL.objects:
        COL.objects.link(e)
    e.empty_display_size = 0.2
    e.parent = parent
    e.matrix_parent_inverse = Matrix.Identity(4)
    e.location = loc
    e.rotation_euler = (0, 0, 0)
    e.scale = (1, 1, 1)
    return e


def reparent(obj, new_parent):
    mw = obj.matrix_world.copy()
    obj.parent = new_parent
    obj.matrix_parent_inverse = new_parent.matrix_world.inverted()
    obj.matrix_world = mw


body = pivot("Pivot_Body", (0, 0, 1.08), ROOT)
SCENE.view_layers[0].update()
head = pivot("Pivot_Head", (0, 0, 0.72), body)            # the neck, 1.8 above ground
arm_r = pivot("Pivot_ArmR", (-0.44, 0.02, 0.54), body)    # shoulders, 1.62 above ground
arm_l = pivot("Pivot_ArmL", (0.44, 0.02, 0.54), body)
SCENE.view_layers[0].update()

HEAD_PARTS = ("Head", "Ear", "HairCap", "HairLock", "Hairline", "SideLock", "Bun", "BunWind", "BunBand",
              "RibbonBand", "BowLoop", "BowKnot", "RibbonTail", "Eye", "Brow", "Blush", "Nose", "Mouth",
              "Tongue", "Moustache", "Beard")
BODY_PARTS = ("Torso", "InnerRobe", "Lapel", "Sash", "Pendant", "Tassel", "Skirt")
ARM_R_PARTS = ("ArmR", "SleeveR", "HandR", "FingerR", "Brush", "Ferrule", "Bristle")
ARM_L_PARTS = ("ArmL", "SleeveL", "FistL", "KnuckleL", "ThumbL")

for o in list(COL.objects):
    if o.name.startswith("Pivot_") or o is ROOT:
        continue
    n = o.name
    if n.startswith(ARM_R_PARTS):
        reparent(o, arm_r)
    elif n.startswith(ARM_L_PARTS):
        reparent(o, arm_l)
    elif n.startswith(HEAD_PARTS) and not n.startswith("BeardTip") or n.startswith("BeardTip"):
        reparent(o, head)
    elif n.startswith(BODY_PARTS):
        reparent(o, body)
SCENE.view_layers[0].update()


# ── Contact shadow on the ground: shrinks and fades as he rises ────────────
def contact_shadow():
    old = bpy.data.objects.get("ContactShadow")
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    me = bpy.data.meshes.new("ContactShadow")
    seg = 48
    verts = [(0, 0, 0)] + [(math.cos(2 * math.pi * i / seg), math.sin(2 * math.pi * i / seg), 0) for i in range(seg)]
    faces = [(0, 1 + i, 1 + (i + 1) % seg) for i in range(seg)]
    me.from_pydata(verts, [], faces)
    o = bpy.data.objects.new("ContactShadow", me)
    COL.objects.link(o)
    o.location = (0.02, 0.05, 0.002)
    o.scale = (0.62, 0.42, 1)
    m = bpy.data.materials.get("W_shadow") or bpy.data.materials.new("W_shadow")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    gt = nt.nodes.new("ShaderNodeTexGradient")
    gt.gradient_type = 'SPHERICAL'
    nt.links.new(tc.outputs["Object"], gt.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    e = ramp.color_ramp.elements
    e[0].position, e[0].color = 0.0, (0, 0, 0, 1)
    e[1].position, e[1].color = 0.9, (0.32, 0.32, 0.32, 1)
    nt.links.new(gt.outputs[0], ramp.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs[0].default_value = (0.13, 0.17, 0.26, 1)
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(ramp.outputs[0], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])
    try:
        m.surface_render_method = 'BLENDED'
    except Exception:
        m.blend_method = 'BLEND'
    o.data.materials.append(m)
    # Driven by his height: smaller and fainter the higher he is.
    for axis, base in ((0, 0.62), (1, 0.42)):
        d = o.driver_add("scale", axis).driver
        v = d.variables.new()
        v.name = "h"
        v.targets[0].id = ROOT
        v.targets[0].data_path = "location.z"
        d.expression = f"{base} * max(0.45, 1 - 0.5 * h)"
    return o


contact_shadow()


# ── Keyframes ───────────────────────────────────────────────────────────────
def clear(o):
    o.animation_data_clear()


for o in (ROOT, body, head, arm_r, arm_l):
    clear(o)
for n in ("Mouth", "Tongue"):
    clear(bpy.data.objects[n])

deg = math.radians


def k(o, f, loc=None, rot=None, sc=None):
    if loc is not None:
        o.location = loc
        o.keyframe_insert("location", frame=f)
    if rot is not None:
        o.rotation_euler = tuple(deg(a) for a in rot)
        o.keyframe_insert("rotation_euler", frame=f)
    if sc is not None:
        o.scale = sc
        o.keyframe_insert("scale", frame=f)


# Root: height, the turn, squash and stretch about the feet.
for f, z in ((1, 0), (40, 0), (50, 0.03), (58, 0), (74, 0), (98, 1.05), (110, 1.1), (122, 1.03), (144, 0), (232, 0)):
    k(ROOT, f, loc=(0, 0, z))
for f, r in ((1, 0), (84, 0), (132, 360), (232, 360)):
    k(ROOT, f, rot=(0, 0, r))
for f, (xy, z) in ((1, (1, 1)), (58, (1, 1)), (72, (1.06, 0.88)), (78, (0.95, 1.1)), (90, (1, 1)),
                   (140, (0.97, 1.05)), (147, (1.09, 0.86)), (153, (0.97, 1.05)), (160, (1.01, 0.98)),
                   (166, (1, 1)), (232, (1, 1))):
    k(ROOT, f, sc=(xy, xy, z))

# Body: leans into the crouch, arches on the way up, bows into the landing.
for f, rx, ry in ((1, 0, 0), (58, 0, 0), (72, 9, 0), (80, -6, 0), (96, 0, 0), (147, 8, 0), (156, -3, 0), (164, 0, 0),
                  (182, 0, -4), (196, 0, 4), (210, 0, 0), (232, 0, 0)):
    k(body, f, rot=(rx, ry, 0))

# Head: a beat behind the body — dips, tips back laughing, nods on landing, wobbles happily.
for f, rx, ry in ((1, 0, 0), (60, 0, 0), (74, 8, 0), (84, -12, 0), (100, -6, 0), (126, -4, 0), (150, 10, 0),
                  (158, -4, 0), (166, 0, 0), (180, 0, 7), (192, 0, -7), (204, 0, 5), (216, 0, 0), (232, 0, 0)):
    k(head, f, rot=(rx, ry, 0))

# Arms: swing down and back for the crouch, throw up on lift-off, a beat late
# on the landing, then a fist pump and a brush wave.
for f, ry in ((1, 0), (58, 0), (72, -34), (82, 16), (98, 6), (126, 4), (149, -18), (160, 4), (170, 0),
              (184, 10), (196, -6), (208, 6), (220, 0), (232, 0)):
    k(arm_r, f, rot=(0, ry, 0))
for f, ry in ((1, 0), (60, 0), (74, 34), (84, -16), (100, -6), (128, -4), (151, 18), (162, -4), (172, 0),
              (180, -14), (188, 8), (196, -14), (206, 4), (218, 0), (232, 0)):
    k(arm_l, f, rot=(0, ry, 0))

# Expression: the laugh opens wide at the top of the jump and on landing.
mouth, tongue = bpy.data.objects["Mouth"], bpy.data.objects["Tongue"]
m0, t0 = tuple(mouth.scale), tuple(tongue.scale)
for f, s in ((1, 1.0), (72, 0.8), (88, 1.45), (126, 1.3), (150, 1.55), (170, 1.15), (232, 1.0)):
    k(mouth, f, sc=(m0[0] * (0.9 + 0.1 * s), m0[1], m0[2] * s))
    k(tongue, f, sc=(t0[0], t0[1], t0[2] * (0.9 + 0.3 * (s - 1))))


def all_fcurves(o):
    act = o.animation_data.action if o.animation_data else None
    if not act:
        return []
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                out.extend(bag.fcurves)
    return out


for o in (ROOT, body, head, arm_r, arm_l, mouth, tongue):
    for c in all_fcurves(o):
        for kp in c.keyframe_points:
            kp.interpolation = 'BEZIER'
            kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
# Gravity on the fall.
for c in all_fcurves(ROOT):
    if c.data_path == "location":
        for kp in c.keyframe_points:
            if kp.co.x == 144:
                kp.interpolation = 'QUAD'
                kp.easing = 'EASE_IN'


# ── Cloth polish ────────────────────────────────────────────────────────────
for o in COL.objects:
    for m in getattr(o, "modifiers", []):
        if m.type == 'CLOTH':
            m.point_cache.frame_start, m.point_cache.frame_end = 1, END
            m.settings.quality = 7
        if m.type == 'SUBSURF' and o.name.startswith(("Sleeve", "Skirt")):
            m.levels = 1
            m.render_levels = 2
        if m.type == 'SOLIDIFY' and m.name == "Thick" and o.name.startswith("Sleeve"):
            m.thickness = 0.02
sk = bpy.data.objects["Skirt"].modifiers["Cloth"].settings
sk.mass, sk.air_damping, sk.bending_stiffness = 0.12, 0.6, 0.05
for n in ("SleeveL", "SleeveR"):
    s = bpy.data.objects[n].modifiers["Cloth"].settings
    s.mass, s.air_damping, s.bending_stiffness = 0.12, 0.9, 0.09

out = os.path.join(os.path.dirname(bpy.data.filepath), "shifu3d_v3.blend")
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("SAVED", out)
