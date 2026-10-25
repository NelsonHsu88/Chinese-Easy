"""
Animation polish pass: shifu3d_v4.blend -> shifu3d_v5.blend (v4 and older stay untouched).

  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b scripts/celebration/shifu3d_v4.blend \
      --python scripts/celebration/blender/animate_v5.py

What changes, and why:

Rig. v4 had no skeleton: the whole figure translated on its root, so knees
never bent and the left foot stayed kicked back the whole time. This adds a
small armature: a Hips bone (carries the body), two-bone legs with IK to
planted foot controls (feet stay locked to the floor while the hips drop),
and knee poles. The root now only spins. Squash and stretch lives on the
body and is cancelled on the head and arms, so his face is never distorted.

Animation. Pose-to-pose keys with overlap (head and each arm a beat behind
the body), a ballistic jump arc (constant gravity, baked per frame), a spin
that accelerates during the ascent and eases out so his face reads before
landing, a two-foot landing that compresses and rebounds, and a celebration
finale. Times below are frames at 60 fps; the action starts at frame 40
(frames 1-39 let the cloth settle and are never rendered).

Follow-through. Beard, brush bristles and bow are spring pendulums simulated
from the real motion of whatever carries them (lag, centrifugal swing in the
spin, overshoot on landing), baked to keys, so renders are deterministic.
Sleeves, skirt, ribbon and sash tails stay cloth.

Look. Soft ambient occlusion in every painted material, a softer sun, and a
contact shadow that thins and widens as he rises and darkens on impact.
"""
import math
import os

import bpy
from mathutils import Matrix, Quaternion, Vector

SCENE = bpy.context.scene
COL = bpy.data.collections["Shifu"]
OB = bpy.data.objects
FPS, START, END = 60, 40, 216
SCENE.render.fps = FPS
SCENE.frame_start, SCENE.frame_end = 1, END
deg = math.radians


def obj(n):
    return OB[n]


def fcurves(o):
    ad = o.animation_data
    act = ad.action if ad else None
    if not act:
        return []
    if hasattr(act, "fcurves"):
        return list(act.fcurves)
    return [c for layer in act.layers for strip in layer.strips for bag in strip.channelbags for c in bag.fcurves]


def smoothstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def hermite(f, f0, f1, y0, y1, v0=0.0, v1=0.0):
    """Cubic Hermite between two frames; v in units per frame."""
    h = f1 - f0
    t = (f - f0) / h
    t2, t3 = t * t, t * t * t
    return ((2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * v0
            + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * v1)


# ── 0. Clean slate: clear old animation, put everything at rest ───────────
ROOT = obj("Shifu_Root")
BODY, HEAD, ARM_R, ARM_L = obj("Pivot_Body"), obj("Pivot_Head"), obj("Pivot_ArmR"), obj("Pivot_ArmL")
for o in OB:
    if o.animation_data:
        o.animation_data_clear()
ROOT.location, ROOT.rotation_euler, ROOT.scale = (0, 0, 0), (0, 0, 0), (1, 1, 1)
for p in (BODY, HEAD, ARM_R, ARM_L):
    p.rotation_euler, p.scale = (0, 0, 0), (1, 1, 1)
SCENE.frame_set(1)
SCENE.view_layers[0].update()


def reparent(o, parent):
    mw = o.matrix_world.copy()
    o.parent = parent
    o.matrix_parent_inverse = parent.matrix_world.inverted()
    o.matrix_basis = Matrix.Identity(4)
    o.matrix_world = mw


def empty(name, loc, parent):
    e = OB.get(name) or bpy.data.objects.new(name, None)
    if e.name not in COL.objects:
        COL.objects.link(e)
    e.empty_display_size = 0.12
    e.parent = None
    e.matrix_world = Matrix.Translation(loc)
    SCENE.view_layers[0].update()
    reparent(e, parent)
    return e


# ── 1. Rig ─────────────────────────────────────────────────────────────────
# Joints measured from the original thigh/shin pieces (v3).
HIP_R, KNEE_R, ANK_R = Vector((-0.16, 0, 0.92)), Vector((-0.15, -0.045, 0.535)), Vector((-0.13, -0.02, 0.15))
HIP_L, KNEE_L, ANK_L0 = Vector((0.17, 0, 0.92)), Vector((0.28, -0.24, 0.60)), Vector((0.35, 0.16, 0.44))
ANK_L = Vector((0.15, -0.02, 0.15))      # where the left foot is planted now

# The left shoe was a plain blob kicked up behind; give him a matching pair:
# a mirror of the right shoe, planted beside it.
old = OB.get("ShoeL")
shoe_r = obj("ShoeR")
me = shoe_r.data.copy()
me.name = "ShoeL"
mirror_x = (ANK_R.x + ANK_L.x) / 2
mw_r = shoe_r.matrix_world.copy()
me.transform(mw_r)                                       # to world
me.transform(Matrix.Translation((mirror_x, 0, 0)) @ Matrix.Scale(-1, 4, (1, 0, 0)) @ Matrix.Translation((-mirror_x, 0, 0)))
me.flip_normals()
if old:
    bpy.data.objects.remove(old, do_unlink=True)
shoe_l = bpy.data.objects.new("ShoeL", me)
COL.objects.link(shoe_l)
for m in shoe_r.modifiers:
    n = shoe_l.modifiers.new(m.name, m.type)
    for attr in ("thickness", "offset", "use_flip_normals", "material_offset", "use_even_offset"):
        if hasattr(m, attr):
            setattr(n, attr, getattr(m, attr))
shoe_l.parent = ROOT

arm_data = bpy.data.armatures.get("ShifuRig") or bpy.data.armatures.new("ShifuRig")
RIG = OB.get("ShifuRig")
if RIG:
    bpy.data.objects.remove(RIG, do_unlink=True)
RIG = bpy.data.objects.new("ShifuRig", arm_data)
COL.objects.link(RIG)
RIG.parent = ROOT
RIG.show_in_front = True
bpy.context.view_layer.objects.active = RIG
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_data.edit_bones
for b in list(eb):
    eb.remove(b)


def bone(name, head, tail, parent=None, connect=False, deform=False):
    b = eb.new(name)
    b.head, b.tail, b.roll = head, tail, 0.0
    b.parent = eb[parent] if parent else None
    b.use_connect = connect
    b.use_deform = deform
    return b


bone("Hips", (0, 0, 0.92), (0, 0, 1.08))
for s, hip, knee, ank in (("R", HIP_R, KNEE_R, ANK_R), ("L", HIP_L, KNEE_L, ANK_L0)):
    bone(f"Thigh.{s}", hip, knee, "Hips", deform=True)
    bone(f"Shin.{s}", knee, ank, f"Thigh.{s}", connect=True, deform=True)
for s, ank in (("R", ANK_R), ("L", ANK_L)):
    bone(f"Foot.{s}", ank, ank + Vector((0, -0.2, 0)))
    bone(f"Pole.{s}", Vector((ank.x, -1.2, 0.55)), Vector((ank.x, -1.3, 0.55)))
bpy.ops.object.mode_set(mode='OBJECT')
REST = {b.name: b.matrix_local.copy() for b in arm_data.bones}

for s in ("R", "L"):
    shin = RIG.pose.bones[f"Shin.{s}"]
    ik = shin.constraints.new('IK')
    ik.target, ik.subtarget = RIG, f"Foot.{s}"
    ik.pole_target, ik.pole_subtarget = RIG, f"Pole.{s}"
    ik.pole_angle = deg(-90)
    ik.chain_count = 2
    ik.use_stretch = True
    for n in (f"Thigh.{s}", f"Shin.{s}"):
        RIG.pose.bones[n].ik_stretch = 0.08
for pb in RIG.pose.bones:
    pb.rotation_mode = 'QUATERNION'


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (a + ab * t - p).length


def skin_leg(o, s, hip, knee, ank):
    for g in list(o.vertex_groups):
        o.vertex_groups.remove(g)
    gt, gs = o.vertex_groups.new(name=f"Thigh.{s}"), o.vertex_groups.new(name=f"Shin.{s}")
    mw = o.matrix_world
    for v in o.data.vertices:
        p = mw @ v.co
        dt, ds = seg_dist(p, hip, knee), seg_dist(p, knee, ank)
        wt = ds ** 4 / (dt ** 4 + ds ** 4 + 1e-12)
        gt.add([v.index], wt, 'REPLACE')
        gs.add([v.index], 1 - wt, 'REPLACE')
    m = o.modifiers.new("Rig", 'ARMATURE')
    m.object = RIG
    o.modifiers.move(o.modifiers.find("Rig"), 0)
    if not any(x.type == 'COLLISION' for x in o.modifiers):
        o.modifiers.new("Collision", 'COLLISION')
        o.modifiers.move(o.modifiers.find("Collision"), 1)


skin_leg(obj("LegR"), "R", HIP_R, KNEE_R, ANK_R)
skin_leg(obj("LegL"), "L", HIP_L, KNEE_L, ANK_L0)
SCENE.view_layers[0].update()


def parent_to_bone(o, bname):
    mw = o.matrix_world.copy()
    b = arm_data.bones[bname]
    pw = RIG.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))
    o.parent, o.parent_type, o.parent_bone = RIG, 'BONE', bname
    o.matrix_parent_inverse = pw.inverted()
    o.matrix_basis = mw


SCENE.view_layers[0].update()
parent_to_bone(shoe_r, "Foot.R")
parent_to_bone(shoe_l, "Foot.L")
parent_to_bone(BODY, "Hips")

# New pivots for overlap: wrist (brush hand), bristles, beard, bow.
SCENE.view_layers[0].update()
WRIST = empty("Pivot_WristR", Vector((-1.02, -0.03, 2.30)), ARM_R)
for n in ("HandR", "BrushHandle", "Ferrule", "Bristles", "BristleTip"):
    reparent(obj(n), WRIST)
ferrule_top = Vector((-1.105, -0.065, 2.84))
BRISTLE = empty("Pivot_Bristle", ferrule_top, WRIST)
for n in ("Bristles", "BristleTip"):
    reparent(obj(n), BRISTLE)
BEARD = empty("Pivot_Beard", Vector((0, -0.56, 2.0)), HEAD)
for n in ("Beard", "BeardTip1", "BeardTip2"):
    reparent(obj(n), BEARD)
BOW = empty("Pivot_Bow", Vector((0.27, 0.24, 2.80)), HEAD)
reparent(obj("Bow"), BOW)
SCENE.view_layers[0].update()


# ── 2. Keying helpers ──────────────────────────────────────────────────────
def key_rot(o, pairs, axis):
    for f, a in pairs:
        o.rotation_euler[axis] = deg(a)
        o.keyframe_insert("rotation_euler", index=axis, frame=f)


def key_vec(o, path, f, vec):
    setattr(o, path, vec)
    o.keyframe_insert(path, frame=f)


def pose_bone_world(name, f, offset=(0, 0, 0), rot=None):
    """Key a root-level bone so its head moves by `offset` and turns by `rot`
    (a world-space Quaternion), both in armature space."""
    pb = RIG.pose.bones[name]
    ml = REST[name]
    r = rot or Quaternion()
    d = Matrix.Translation(ml.translation + Vector(offset)) @ r.to_matrix().to_4x4() @ ml.to_3x3().to_4x4()
    basis = ml.inverted() @ d
    loc, q, _ = basis.decompose()
    pb.location, pb.rotation_quaternion = loc, q
    pb.keyframe_insert("location", frame=f)
    pb.keyframe_insert("rotation_quaternion", frame=f)


# ── 3. Hips: crouch, push, ballistic arc, impact, rebound ──────────────────
TAKEOFF, LAND_PLAN = 71, 145        # feet leave / hips reach landing height
Z_TO, Z_LAND, APEX = 0.02, -0.03, 0.98
T_AIR = LAND_PLAN - TAKEOFF
# Constant gravity: solve launch speed v0 and g for the apex and landing heights.
# apex: Z_TO + v0^2/(2g) = APEX ; land: Z_TO + v0 T - g T^2 / 2 = Z_LAND
# With x = v0*T and D = apex rise: x^2 - 4Dx + 4D(Z_LAND - Z_TO) = 0; the larger
# root is the arc that lands after its apex.
D = APEX - Z_TO
x = 2 * D + math.sqrt(4 * D * D - 4 * D * (Z_LAND - Z_TO))
V0 = x / T_AIR
G = V0 * V0 / (2 * D)
V_LAND = V0 - G * T_AIR


def hip_dz(f):
    if f <= 45:
        return hermite(f, 40, 45, 0, 0.012) if f >= 40 else 0.0     # a small excited lift
    if f <= 49:
        return hermite(f, 45, 49, 0.012, 0.0)
    if f <= 62:
        return hermite(f, 49, 62, 0.0, -0.31)                      # crouch (~215 ms)
    if f <= 64:
        return hermite(f, 62, 64, -0.31, -0.315)                   # max compression
    if f <= TAKEOFF:
        # Push-off: 7 frames, so it accelerates all the way into the launch
        # speed instead of overshooting it and slowing (a visible hitch).
        return hermite(f, 64, TAKEOFF, -0.315, Z_TO, 0.0, V0)
    if f <= LAND_PLAN:
        t = f - TAKEOFF
        return Z_TO + V0 * t - G * t * t / 2                        # gravity
    if f <= 152:
        return hermite(f, LAND_PLAN, 152, Z_LAND, -0.34, V_LAND, 0)  # impact absorb
    # Rebound: slower and smaller than the fall, so he has weight, not spring.
    for a, b, ya, yb in ((152, 165, -0.34, 0.02), (165, 172, 0.02, -0.012), (172, 179, -0.012, 0.0),
                         (179, 185, 0.0, 0.025), (185, 192, 0.025, -0.008), (192, 199, -0.008, 0.0)):
        if f <= b:
            return hermite(f, a, b, ya, yb)
    return 0.0


def tuck(f, s):
    """How far a foot is drawn up (z) and back (y) under him in the air."""
    lag = 2 if s == "L" else 0
    amt = smoothstep(TAKEOFF + lag, 84 + lag, f) * (1 - smoothstep(126 + lag, 141, f))
    return (0.20, 0.10) if s == "R" else (0.30, 0.16), amt


GROUND_ANKLE = 0.15
contact = {}
for f in range(1, END + 1):
    dz = hip_dz(f)
    pose_bone_world("Hips", f, (0, 0, dz))
    for s in ("R", "L"):
        (tz, ty), a = tuck(f, s)
        free = dz - Z_TO + tz * a                       # ankle height above the floor if airborne
        if TAKEOFF <= f < LAND_PLAN + 4 and free > 0:
            point = deg(-18) * a                        # toes point down as the legs tuck
            pose_bone_world(f"Foot.{s}", f, (0.03 * a if s == "L" else -0.02 * a, ty * a, free),
                            Quaternion((1, 0, 0), point))
        else:
            pose_bone_world(f"Foot.{s}", f)
            if f >= LAND_PLAN - 10:
                contact.setdefault(s, f)
for c in fcurves(RIG):
    for kp in c.keyframe_points:
        kp.interpolation = 'LINEAR'
print("HIP v0 %.4f m/f  g %.5f m/f^2  landing speed %.4f m/f  contact %s" % (V0, G, V_LAND, contact))


# ── 4. Spin: root turns once; speeds up on the ascent, eases out to the face ─
SPIN0, SPIN1 = 74, 127
ws = [smoothstep(0, 0.2, i / 400) * (1 - smoothstep(0.5, 1.0, i / 400)) for i in range(401)]
cum = [0.0]
for w in ws[1:]:
    cum.append(cum[-1] + w)
for f in range(1, END + 1):
    s = (f - SPIN0) / (SPIN1 - SPIN0)
    a = 0.0 if s <= 0 else 360.0 if s >= 1 else 360.0 * cum[int(s * 400)] / cum[-1]
    ROOT.rotation_euler[2] = deg(a)
    ROOT.keyframe_insert("rotation_euler", index=2, frame=f)
for c in fcurves(ROOT):
    for kp in c.keyframe_points:
        kp.interpolation = 'LINEAR'


# ── 5. Body, head, arms: pose to pose with overlap ─────────────────────────
key_rot(BODY, [(1, 0), (40, 0), (49, -2), (62, 12), (65, 13), (68, 4), (72, -8), (84, -3), (100, 2), (126, 0),
               (138, -4), (LAND_PLAN, 2), (150, 11), (156, -4), (162, 2), (168, -1), (176, 0)], 0)   # lean
key_rot(BODY, [(1, 0), (84, 0), (100, 6), (118, -4), (132, 0), (170, -3), (184, 2), (196, 0)], 1)  # side
key_rot(BODY, [(1, 0), (52, 0), (64, -14), (70, -10), (78, 12), (96, 8), (118, 3), (127, -5), (134, 2),
               (140, 0), (170, 0), (186, 6), (200, 5)], 2)                                                                       # twist

SQUASH = [(1, 1, 1), (40, 1, 1), (49, 1, 1), (63, 1.06, 0.93), (65, 1.065, 0.925), (68, 0.95, 1.08),
          (74, 0.97, 1.04), (86, 1, 1), (138, 0.985, 1.015), (LAND_PLAN, 1, 1), (150, 1.08, 0.9),
          (153, 1.075, 0.905), (159, 0.97, 1.04), (166, 1.01, 0.985), (172, 1, 1), (178, 0.99, 1.012),
          (185, 1.005, 0.995), (192, 1, 1)]
for f, xy, z in SQUASH:
    key_vec(BODY, "scale", f, (xy, xy, z))
    for p in (HEAD, ARM_R, ARM_L):          # cancel it: no squashed face or hands
        key_vec(p, "scale", f, (1 / xy, 1 / xy, 1 / z))

key_rot(HEAD, [(1, 0), (40, 0), (45, -3), (52, -2), (58, 4), (66, 11), (70, 9), (76, -10), (88, -4), (110, -2),
               (132, 4), (LAND_PLAN, 2), (149, 6), (154, 13), (160, -5), (168, -6), (176, -4), (200, -3)], 0)
key_rot(HEAD, [(1, 0), (40, 0), (45, 3), (52, 0), (100, 4), (120, -3), (140, 0), (165, 0), (172, 8),
               (182, 5), (194, 6)], 1)
key_rot(HEAD, [(1, 0), (54, 0), (64, 9), (72, 6), (80, -14), (96, -8), (114, 2), (126, 7), (134, -2),
               (142, 0), (172, 0), (186, -3), (200, -2)], 2)

# Right arm holds the brush and leads the spin; left arm trails, then pumps.
# His rest pose already has both arms raised: past ~25 deg they fold onto his head.
key_rot(ARM_R, [(1, 0), (40, 0), (45, 4), (50, 0), (63, -30), (66, -26), (73, 22), (80, 26), (96, 24),
                (112, 18), (128, 10), (140, 4), (LAND_PLAN, 2), (152, -14), (158, 6), (164, 22), (170, 17),
                (178, 20), (188, 19)], 1)
key_rot(ARM_R, [(1, 0), (50, 0), (63, -22), (67, -18), (74, 14), (90, 18), (116, 10), (132, 0),
                (LAND_PLAN, -2), (152, -8), (164, 14), (176, 10), (188, 12)], 2)
key_rot(ARM_L, [(1, 0), (40, 0), (46, -3), (52, 0), (65, 30), (68, 26), (76, -18), (84, -14), (100, 10),
                (116, 16), (130, 6), (140, 0), (147, 4), (154, 18), (162, 2), (167, -16), (172, 4),
                (177, -10), (184, 16), (192, 12), (200, 14)], 1)
key_rot(ARM_L, [(1, 0), (52, 0), (65, 24), (69, 20), (76, 6), (92, 22), (112, 28), (130, 10),
                (LAND_PLAN, 0), (156, 4), (170, -6), (184, -16), (196, -14)], 2)
key_rot(WRIST, [(1, 0), (40, 0), (63, 10), (72, -12), (84, -6), (110, -8), (140, 0), (152, 8), (164, -12),
                (172, -14), (182, -18), (194, -16)], 1)


# ── 6. Face ────────────────────────────────────────────────────────────────
EYE_W, EYE_H, EYE_D = 0.068, 0.092, 0.034
OPEN = [(1, 1, 0, 0), (40, 1, 0, 0), (42, 1, 0, 0.004), (44, 0.06, 0, 0), (47, 1.06, 0, 0.006),
        (50, 1.0, 0, 0.004), (56, 0.9, 0, -0.008), (63, 0.78, 0, -0.012), (66, 0.8, 0, -0.01),
        (70, 1.15, 0, 0.014), (78, 1.12, 0, 0.012), (100, 1.05, 0.004, 0.006), (124, 1.02, 0, 0),
        (134, 1.0, 0, -0.012), (141, 0.9, 0, -0.012), (144, 0.55, 0, -0.006), (146, 0.06, 0, 0),
        (172, 0.06, 0, 0), (176, 1.08, 0, 0.006), (182, 1.0, 0, 0.004), (190, 1.0, 0, 0.004),
        (193, 0.06, 0, 0), (197, 1.0, 0, 0.004), (END, 1.0, 0, 0.004)]
SHUT_FROM, SHUT_TO = 146, 173            # happy-arc window
for side in ("L", "R"):
    eye = obj(f"EyeOpen{side}")
    for f, op, gx, gz in OPEN:
        key_vec(eye, "scale", f, (EYE_W * (1 + 0.12 * (1 - min(op, 1))), EYE_D, EYE_H * op))
        key_vec(eye, "location", f, (gx, 0, gz - 0.25 * EYE_H * (1 - min(op, 1))))
    for o in [eye] + list(eye.children):
        for f, hide in ((1, False), (SHUT_FROM, True), (SHUT_TO, False)):
            o.hide_render = hide
            o.keyframe_insert("hide_render", frame=f)
    arc = obj(f"Eye{side}")
    # The arc's origin was the world origin, so squashing it to hide it slid it
    # down to the floor. Centre the origin on the stroke so it opens in place.
    pts = [bp for sp in arc.data.splines for bp in sp.bezier_points]
    c = sum((bp.co for bp in pts), Vector()) / len(pts)
    for bp in pts:
        bp.co -= c
        bp.handle_left -= c
        bp.handle_right -= c
    arc.scale = (1, 1, 1)
    arc.location = arc.location + arc.matrix_basis.to_3x3() @ c
    a0 = Vector((1, 1, 1))
    for f, s in ((1, 0), (SHUT_FROM - 1, 0), (SHUT_FROM + 2, 1), (SHUT_TO - 2, 1), (SHUT_TO, 0)):
        key_vec(arc, "scale", f, (a0.x, a0.y, a0.z * max(s, 0.001)))
    for f, hide in ((1, True), (SHUT_FROM, False), (SHUT_TO, True)):
        arc.hide_render = hide
        arc.keyframe_insert("hide_render", frame=f)

BROW = [(1, 0, 0), (40, 0, 0), (44, 0.012, 3), (50, 0.008, 2), (62, -0.02, -6), (66, -0.018, -5),
        (71, 0.022, 6), (90, 0.015, 4), (130, 0.005, 1), (141, 0, 0), (147, -0.016, -3), (153, 0.02, 6),
        (172, 0.015, 4), (182, 0.006, 2)]
for side, sx in (("L", 1), ("R", -1)):
    b = obj(f"Brow{side}")
    base = b.location.copy()
    for f, dz, tilt in BROW:
        key_vec(b, "location", f, (base.x, base.y, base.z + dz))
        b.rotation_euler = (0, deg(tilt * sx), 0)
        b.keyframe_insert("rotation_euler", frame=f)

mouth, tongue = obj("Mouth"), obj("Tongue")
m0, t0 = mouth.scale.copy(), tongue.scale.copy()
for f, s in ((1, 1.1), (40, 1.1), (46, 1.2), (56, 0.95), (64, 0.85), (72, 1.45), (90, 1.35), (126, 1.3),
             (140, 1.15), (146, 1.1), (153, 1.6), (170, 1.5), (184, 1.3), (200, 1.22)):
    key_vec(mouth, "scale", f, (m0.x * (0.9 + 0.1 * s), m0.y, m0.z * s))
    key_vec(tongue, "scale", f, (t0.x, t0.y, t0.z * (0.9 + 0.3 * (s - 1))))

for side in ("L", "R"):          # cheeks lift with the smile
    bl = obj(f"Blush{side}")
    l0, s0 = bl.location.copy(), bl.scale.copy()
    for f, dz, k in ((1, 0, 1), (60, 0, 1), (72, 0.008, 1.04), (90, 0.008, 1.04), (140, 0, 1), (144, 0, 1),
                     (150, 0.018, 1.12), (172, 0.015, 1.1), (184, 0.008, 1.05)):
        key_vec(bl, "location", f, (l0.x, l0.y, l0.z + dz))
        key_vec(bl, "scale", f, tuple(c * k for c in s0))


# ── 7. Smooth the posed channels ───────────────────────────────────────────
BAKED = {RIG.name, ROOT.name}
for o in OB:
    if o.name in BAKED:
        continue
    for c in fcurves(o):
        for kp in c.keyframe_points:
            if c.data_path == "hide_render":
                kp.interpolation = 'CONSTANT'
            else:
                kp.interpolation = 'BEZIER'
                kp.handle_left_type = kp.handle_right_type = 'AUTO_CLAMPED'
        c.update()


# ── 8. Follow-through: spring pendulums simulated from the real motion ─────
CLOTHS = [m for o in OB if o.type == 'MESH' for m in o.modifiers if m.type == 'CLOTH']


def frame_of(p):
    """World matrix of a pivot's frame before its own rotation."""
    m = p.parent.matrix_world @ p.matrix_parent_inverse @ Matrix.Translation(p.location)
    loc, rot, _ = m.decompose()
    return loc, rot


def bake_pendulum(p, rest_dir, length, freq, zeta, max_deg, stretch=None):
    for m in CLOTHS:
        m.show_viewport = False
    p.rotation_mode = 'QUATERNION'
    rest_dir = rest_dir.normalized()
    k, c = (2 * math.pi * freq) ** 2, 2 * zeta * 2 * math.pi * freq
    samples = []
    for f in range(1, END + 1):
        SCENE.frame_set(f)
        samples.append(frame_of(p))
    pos = samples[0][0] + samples[0][1] @ rest_dir * length
    vel = Vector()
    sub, dt = 8, 1 / FPS / 8
    for i, f in enumerate(range(1, END + 1)):
        o1, r1 = samples[i]
        o0, r0 = samples[max(i - 1, 0)]
        for j in range(1, sub + 1):
            t = j / sub
            o, r = o0.lerp(o1, t), r0.slerp(r1, t)
            target = o + r @ rest_dir * length
            acc = (target - pos) * k - vel * c
            vel += acc * dt
            pos += vel * dt
        local = r1.inverted() @ (pos - o1)
        q = rest_dir.rotation_difference(local.normalized())
        ang = min(q.angle, deg(max_deg))
        q = Quaternion(q.axis, ang) if q.angle > 1e-6 else Quaternion()
        p.rotation_quaternion = q
        p.keyframe_insert("rotation_quaternion", frame=f)
        if stretch:
            sc = max(stretch[0], min(stretch[1], local.length / length))
            p.scale = (1 / math.sqrt(sc), 1 / math.sqrt(sc), sc)
            p.keyframe_insert("scale", frame=f)
    for m in CLOTHS:
        m.show_viewport = True
    for cv in fcurves(p):
        for kp in cv.keyframe_points:
            kp.interpolation = 'LINEAR'
    print(f"PENDULUM {p.name}: {END} frames")


bake_pendulum(BEARD, Vector((0, -0.08, -1)), 0.75, freq=2.2, zeta=0.42, max_deg=14, stretch=(0.95, 1.05))
tip = Vector((-1.15, -0.07, 3.16))
bake_pendulum(BRISTLE, tip - ferrule_top, 0.32, freq=3.4, zeta=0.35, max_deg=12)
bake_pendulum(BOW, Vector((0.6, 0.35, 0.1)), 0.2, freq=3.0, zeta=0.3, max_deg=9)


# ── 9. Contact shadow: thins and widens as he rises, darkens on impact ─────
shadow = obj("ContactShadow")
for i in (0, 1):
    shadow.driver_remove("scale", i)
m = shadow.data.materials[0]
nt = m.node_tree
if "ShadowAlpha" not in nt.nodes:
    info = nt.nodes.new("ShaderNodeObjectInfo")
    mul = nt.nodes.new("ShaderNodeMath")
    mul.name, mul.operation, mul.use_clamp = "ShadowAlpha", 'MULTIPLY', True
    mix = next(n for n in nt.nodes if n.type == 'MIX_SHADER')
    src = mix.inputs[0].links[0].from_socket
    nt.links.new(src, mul.inputs[0])
    nt.links.new(info.outputs["Alpha"], mul.inputs[1])
    nt.links.new(mul.outputs[0], mix.inputs[0])
for f in range(1, END + 1):
    dz = hip_dz(f)
    (tz, _), a = tuck(f, "R")
    h = max(0.0, dz - Z_TO + tz * a) if TAKEOFF <= f < LAND_PLAN + 4 else 0.0
    rise = min(h / APEX, 1.0)
    press = max(0.0, -dz) / 0.34                  # weight pressing into the floor
    k_scale = (1 + 0.38 * rise) * (1 - 0.07 * press)
    alpha = (1 - 0.68 * rise) * (1 + 0.35 * press)
    shadow.scale = (0.66 * k_scale, 0.44 * k_scale, 1)
    shadow.color = (1, 1, 1, min(alpha, 1.6) / 1.6)
    shadow.keyframe_insert("scale", frame=f)
    shadow.keyframe_insert("color", frame=f)
# The ramp's peak opacity is scaled up so alpha 1/1.6 = the old resting look.
ramp = next(n for n in nt.nodes if n.type == 'VALTORGB')
ramp.color_ramp.elements[1].color = (0.42, 0.42, 0.42, 1)
for c in fcurves(shadow):
    for kp in c.keyframe_points:
        kp.interpolation = 'LINEAR'


# ── 10. Look: soft AO in every painted material, softer sun ────────────────
AO_STRENGTH = {"W_skin": 0.3, "W_white": 0.42, "W_robe": 0.38, "W_ivory": 0.38, "W_trousers": 0.38}
for mat in bpy.data.materials:
    if not mat.use_nodes or "SoftAO" in mat.node_tree.nodes:
        continue
    nt = mat.node_tree
    em = next((n for n in nt.nodes if n.type == 'EMISSION'), None)
    if em is None or not any(n.type == 'SHADERTORGB' for n in nt.nodes) or not em.inputs[0].is_linked:
        continue
    src = em.inputs[0].links[0].from_socket
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.name = "SoftAO"
    ao.inputs["Distance"].default_value = 0.3
    s = AO_STRENGTH.get(mat.name, 0.3)
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["To Min"].default_value = 1 - s
    nt.links.new(ao.outputs["AO"], mr.inputs["Value"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type, mul.blend_type = 'RGBA', 'MULTIPLY'
    mul.inputs[0].default_value = 1.0
    nt.links.new(src, mul.inputs[6])
    nt.links.new(mr.outputs[0], mul.inputs[7])
    nt.links.new(mul.outputs[2], em.inputs[0])
    print("AO", mat.name, s)
obj("ShifuSun").data.angle = deg(22)

# Cloth caches cover the new range.
for m in CLOTHS:
    m.point_cache.frame_start, m.point_cache.frame_end = 1, END

SCENE.frame_set(1)
out = os.path.join(os.path.dirname(bpy.data.filepath), "shifu3d_v5.blend")
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
print("SAVED", out)
