import bpy
import bmesh
import math
from collections import defaultdict
from mathutils import Vector

OUT_GLB = r"e:\program\3D易拉罐\3D_model\models\coca_cola_bottle.glb"


def smoothstep(a, b, x):
    if b - a == 0:
        return 0.0
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def get_image_by_hint(hints):
    for img in bpy.data.images:
        name = (img.name or "").lower()
        if any(h in name for h in hints):
            return img
    return None


def ensure_principled_with_image(mat, image):
    if not mat:
        return
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (420, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (140, 0)
    tex = nodes.new("ShaderNodeTexImage")
    tex.location = (-220, 80)
    tex.interpolation = 'Linear'
    tex.image = image
    if tex.image:
        try:
            tex.image.colorspace_settings.name = "sRGB"
        except Exception:
            pass

    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    bsdf.inputs["Roughness"].default_value = 0.35
    bsdf.inputs["Metallic"].default_value = 0.02


def set_first_input(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return True
    return False


def ensure_glass_principled(mat):
    if not mat:
        return
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (420, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (140, 0)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    # Slightly dark soda-glass tint.
    if "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = (0.06, 0.07, 0.08, 1.0)

    set_first_input(bsdf, ["Roughness"], 0.06)
    set_first_input(bsdf, ["Metallic"], 0.0)
    set_first_input(bsdf, ["IOR"], 1.46)

    # Blender versions use different socket names.
    set_first_input(bsdf, ["Transmission Weight", "Transmission"], 1.0)
    set_first_input(bsdf, ["Alpha"], 1.0)

    # Keep opaque mode; transmission extension handles glass in glTF.
    mat.blend_method = 'OPAQUE'


def ensure_liquid_material():
    name = "ColaLiquid"
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nodes = nt.nodes
    links = nt.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (420, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (140, 0)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    # Cola-like deep tone with visible transparency.
    if "Base Color" in bsdf.inputs:
        bsdf.inputs["Base Color"].default_value = (0.05, 0.012, 0.006, 1.0)
    set_first_input(bsdf, ["Roughness"], 0.03)
    set_first_input(bsdf, ["Metallic"], 0.0)
    set_first_input(bsdf, ["IOR"], 1.34)
    # Keep liquid readable-transparent: use alpha blend, avoid extra darkening from transmission.
    set_first_input(bsdf, ["Transmission Weight", "Transmission"], 0.0)
    set_first_input(bsdf, ["Alpha"], 0.62)

    # Use blend to ensure visible transparency in basic viewers.
    mat.blend_method = 'BLEND'
    return mat


def get_axis_info(min_v, max_v):
    size = max_v - min_v
    if size.x >= size.y and size.x >= size.z:
        return "x", size
    if size.z >= size.x and size.z >= size.y:
        return "z", size
    return "y", size


def create_liquid_inside_body(body_obj):
    # Remove old generated liquid mesh if exists.
    for o in list(bpy.data.objects):
        if o.name.lower().startswith("colaliquidmesh"):
            bpy.data.objects.remove(o, do_unlink=True)

    src_me = body_obj.data
    verts = [v.co.copy() for v in src_me.vertices]
    if not verts:
        return None

    min_v = Vector((min(v.x for v in verts), min(v.y for v in verts), min(v.z for v in verts)))
    max_v = Vector((max(v.x for v in verts), max(v.y for v in verts), max(v.z for v in verts)))
    center = (min_v + max_v) * 0.5
    axis, size = get_axis_info(min_v, max_v)

    if axis == "x":
        hmin, hmax = min_v.x, max_v.x
    elif axis == "z":
        hmin, hmax = min_v.z, max_v.z
    else:
        hmin, hmax = min_v.y, max_v.y
    hspan = max(hmax - hmin, 1e-6)

    # Build radius profile from source body vertices.
    bin_count = 64
    bins = [[] for _ in range(bin_count)]
    for v in verts:
        if axis == "x":
            h = v.x
            r = math.sqrt((v.y - center.y) ** 2 + (v.z - center.z) ** 2)
        elif axis == "z":
            h = v.z
            r = math.sqrt((v.x - center.x) ** 2 + (v.y - center.y) ** 2)
        else:
            h = v.y
            r = math.sqrt((v.x - center.x) ** 2 + (v.z - center.z) ** 2)

        t = max(0.0, min(1.0, (h - hmin) / hspan))
        idx = min(bin_count - 1, int(t * (bin_count - 1)))
        bins[idx].append(r)

    radius_profile = [0.0] * bin_count
    for i in range(bin_count):
        if bins[i]:
            arr = sorted(bins[i])
            radius_profile[i] = arr[int(0.80 * (len(arr) - 1))]

    # Fill empty bins with nearest known value.
    last = None
    for i in range(bin_count):
        if radius_profile[i] > 0:
            last = radius_profile[i]
        elif last is not None:
            radius_profile[i] = last
    last = None
    for i in range(bin_count - 1, -1, -1):
        if radius_profile[i] > 0:
            last = radius_profile[i]
        elif last is not None:
            radius_profile[i] = last
    fallback = max(radius_profile) * 0.5 if max(radius_profile) > 0 else 0.1
    radius_profile = [r if r > 0 else fallback for r in radius_profile]
    # Smooth local dents/noise so liquid body stays visually clean.
    for _ in range(4):
        smoothed = radius_profile[:]
        for i in range(1, bin_count - 1):
            smoothed[i] = (
                radius_profile[i - 1] * 0.22
                + radius_profile[i] * 0.56
                + radius_profile[i + 1] * 0.22
            )
        radius_profile = smoothed

    def radius_at(t01):
        x = max(0.0, min(1.0, t01)) * (bin_count - 1)
        i0 = int(math.floor(x))
        i1 = min(bin_count - 1, i0 + 1)
        f = x - i0
        return radius_profile[i0] * (1.0 - f) + radius_profile[i1] * f

    # Liquid fill range.
    h0 = hmin + hspan * 0.10
    h1 = hmin + hspan * 0.47
    ring_count = 64
    seg_count = 128
    radial_shrink = 0.84
    radial_clearance = max(radius_profile) * 0.085

    bm = bmesh.new()
    rings = []
    for i in range(ring_count):
        ft = i / max(ring_count - 1, 1)
        h = h0 + (h1 - h0) * ft
        t_global = (h - hmin) / hspan
        r_base = max(0.001, radius_at(t_global) - radial_clearance)
        # Keep a little extra inset around shoulder and waist to avoid z-fighting with bottle wall.
        zone = smoothstep(0.16, 0.30, t_global) * (1.0 - smoothstep(0.68, 0.84, t_global))
        local_shrink = radial_shrink - 0.035 * zone
        r = max(0.001, r_base * local_shrink)
        ring = []
        for j in range(seg_count):
            a = (2.0 * math.pi * j) / seg_count
            c = math.cos(a)
            s = math.sin(a)
            if axis == "x":
                co = Vector((h, center.y + r * c, center.z + r * s))
            elif axis == "z":
                co = Vector((center.x + r * c, center.y + r * s, h))
            else:
                co = Vector((center.x + r * c, h, center.z + r * s))
            ring.append(bm.verts.new(co))
        rings.append(ring)

    bm.verts.ensure_lookup_table()

    # Side faces.
    for i in range(ring_count - 1):
        r0 = rings[i]
        r1 = rings[i + 1]
        for j in range(seg_count):
            jn = (j + 1) % seg_count
            bm.faces.new((r0[j], r0[jn], r1[jn], r1[j]))

    # Bottom cap.
    if axis == "x":
        cbot = bm.verts.new(Vector((h0, center.y, center.z)))
    elif axis == "z":
        cbot = bm.verts.new(Vector((center.x, center.y, h0)))
    else:
        cbot = bm.verts.new(Vector((center.x, h0, center.z)))
    for j in range(seg_count):
        jn = (j + 1) % seg_count
        bm.faces.new((cbot, rings[0][j], rings[0][jn]))

    # Top cap.
    if axis == "x":
        ctop = bm.verts.new(Vector((h1, center.y, center.z)))
    elif axis == "z":
        ctop = bm.verts.new(Vector((center.x, center.y, h1)))
    else:
        ctop = bm.verts.new(Vector((center.x, h1, center.z)))
    for j in range(seg_count):
        jn = (j + 1) % seg_count
        bm.faces.new((ctop, rings[-1][jn], rings[-1][j]))

    bm.normal_update()
    liquid_mesh = bpy.data.meshes.new("ColaLiquidMeshData")
    bm.to_mesh(liquid_mesh)
    bm.free()

    liquid_obj = bpy.data.objects.new("ColaLiquidMesh", liquid_mesh)
    liquid_obj.matrix_world = body_obj.matrix_world.copy()
    bpy.context.collection.objects.link(liquid_obj)

    # Assign liquid material.
    liquid_mat = ensure_liquid_material()
    liquid_obj.data.materials.clear()
    liquid_obj.data.materials.append(liquid_mat)
    for p in liquid_obj.data.polygons:
        p.material_index = 0
        p.use_smooth = True

    return liquid_obj


def assign_single_material(obj, mat):
    if not obj or obj.type != 'MESH' or not mat:
        return
    me = obj.data
    me.materials.clear()
    me.materials.append(mat)
    for poly in me.polygons:
        poly.material_index = 0


def remove_internal_planar_caps(obj):
    if not obj or obj.type != 'MESH' or not obj.data or len(obj.data.vertices) == 0:
        return 0

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()

    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    min_v = Vector((min(xs), min(ys), min(zs)))
    max_v = Vector((max(xs), max(ys), max(zs)))
    size = max_v - min_v

    if size.x >= size.y and size.x >= size.z:
        axis = 'x'
        axis_vec = Vector((1.0, 0.0, 0.0))
        hmin, hmax = min_v.x, max_v.x
    elif size.z >= size.x and size.z >= size.y:
        axis = 'z'
        axis_vec = Vector((0.0, 0.0, 1.0))
        hmin, hmax = min_v.z, max_v.z
    else:
        axis = 'y'
        axis_vec = Vector((0.0, 1.0, 0.0))
        hmin, hmax = min_v.y, max_v.y

    hspan = max(hmax - hmin, 1e-6)
    flat_eps = max(hspan * 0.0008, 1e-4)
    bins = defaultdict(list)
    area_by_bin = defaultdict(float)

    def get_h(vco):
        if axis == 'x':
            return vco.x
        if axis == 'z':
            return vco.z
        return vco.y

    for f in bm.faces:
        hs = [get_h(v.co) for v in f.verts]
        if (max(hs) - min(hs)) > flat_eps:
            continue
        n = f.normal.normalized()
        if abs(n.dot(axis_vec)) < 0.94:
            continue
        hc = sum(hs) / len(hs)
        t = (hc - hmin) / hspan
        if t < 0.12 or t > 0.88:
            continue
        key = round(hc, 4)
        bins[key].append(f)
        area_by_bin[key] += f.calc_area()

    to_delete = []
    for key, faces in bins.items():
        if len(faces) >= 80 and area_by_bin[key] >= 0.12:
            to_delete.extend(faces)

    if to_delete:
        bmesh.ops.delete(bm, geom=to_delete, context='FACES')
        bm.normal_update()
        bm.to_mesh(obj.data)
        obj.data.update()

    removed = len(to_delete)
    bm.free()
    return removed


# Remove floor/background helpers.
for obj in list(bpy.data.objects):
    n = obj.name.lower()
    if n.startswith("floor") or n in {"plane", "ground"}:
        bpy.data.objects.remove(obj, do_unlink=True)

mesh_objs = [o for o in bpy.data.objects if o.type == 'MESH']
if not mesh_objs:
    raise RuntimeError("No mesh objects found in Coca_Cola.blend")

# Pick main body object.
body = None
for o in mesh_objs:
    if "bottle" in o.name.lower() or "can" in o.name.lower() or "body" in o.name.lower():
        body = o
        break
if body is None:
    body = max(mesh_objs, key=lambda o: o.dimensions.x * o.dimensions.y * o.dimensions.z)

# Make subtle dents on body mesh.
if body.data and len(body.data.vertices) > 0:
    me = body.data
    bm = bmesh.new()
    bm.from_mesh(me)

    # Local-space bounds.
    xs = [v.co.x for v in bm.verts]
    ys = [v.co.y for v in bm.verts]
    zs = [v.co.z for v in bm.verts]
    min_v = Vector((min(xs), min(ys), min(zs)))
    max_v = Vector((max(xs), max(ys), max(zs)))
    size = max_v - min_v

    # Use longest axis as height axis.
    if size.x >= size.y and size.x >= size.z:
        axis = 'x'
        hmin, hmax = min_v.x, max_v.x
        c1, c2 = 1, 2
        radial_base = (size.y + size.z) * 0.5
    elif size.z >= size.x and size.z >= size.y:
        axis = 'z'
        hmin, hmax = min_v.z, max_v.z
        c1, c2 = 0, 1
        radial_base = (size.x + size.y) * 0.5
    else:
        axis = 'y'
        hmin, hmax = min_v.y, max_v.y
        c1, c2 = 0, 2
        radial_base = (size.x + size.z) * 0.5

    center = (min_v + max_v) * 0.5
    hspan = max(hmax - hmin, 1e-6)
    amp = radial_base * 0.012  # subtle

    for v in bm.verts:
        p = v.co
        if axis == 'x':
            h = (p.x - hmin) / hspan
            a = p.y - center.y
            b = p.z - center.z
        elif axis == 'z':
            h = (p.z - hmin) / hspan
            a = p.x - center.x
            b = p.y - center.y
        else:
            h = (p.y - hmin) / hspan
            a = p.x - center.x
            b = p.z - center.z

        r = math.sqrt(a * a + b * b)
        if r < 1e-7:
            continue

        band = smoothstep(0.15, 0.30, h) * (1.0 - smoothstep(0.72, 0.88, h))
        ang = math.atan2(b, a)
        inset = -amp * band * (0.55 + 0.45 * math.sin(ang * 8.0))
        scale = (r + inset) / r

        na = a * scale
        nb = b * scale

        if axis == 'x':
            v.co.y = center.y + na
            v.co.z = center.z + nb
        elif axis == 'z':
            v.co.x = center.x + na
            v.co.y = center.y + nb
        else:
            v.co.x = center.x + na
            v.co.z = center.z + nb

    bm.to_mesh(me)
    bm.free()
    me.update()

# Add internal cola liquid mesh.
liquid_obj = create_liquid_inside_body(body)

# Force glTF-friendly textured PBR material for label/body so texture is preserved in GLB.
label_img = get_image_by_hint(["coca-cola", "coke", "label"])
if label_img:
    for mat_name in ("Coca Cola", "Material.003"):
        mat = bpy.data.materials.get(mat_name)
        if mat:
            ensure_principled_with_image(mat, label_img)

# Ensure bottle body exports as real glass-like material.
glass_mat = bpy.data.materials.get("Material.002")
if glass_mat:
    ensure_glass_principled(glass_mat)

# Remove accidental internal planar cap(s) that show as floating disks.
if body:
    removed_caps = remove_internal_planar_caps(body)
    if removed_caps:
        print("Removed internal planar cap faces:", removed_caps)

# IMPORTANT: keep bottle fully glass; avoid accidental red-shell material assignment on body faces.
if glass_mat and body:
    assign_single_material(body, glass_mat)

# Keep label material only on dedicated sticker mesh.
sticker_obj = None
for o in bpy.data.objects:
    if o.type == 'MESH' and "sticker" in o.name.lower():
        sticker_obj = o
        break
label_mat = bpy.data.materials.get("Material.003") or bpy.data.materials.get("Coca Cola")
if sticker_obj and label_mat:
    assign_single_material(sticker_obj, label_mat)

# Material polish.
for mat in bpy.data.materials:
    if not mat or not mat.use_nodes or not mat.node_tree:
        continue
    lname = mat.name.lower()
    principled = None
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            principled = node
            break
    if not principled:
        continue

    if "coca" in lname or "label" in lname:
        principled.inputs['Roughness'].default_value = 0.28
        principled.inputs['Metallic'].default_value = 0.05
    elif "material.002" in lname or "metal" in lname:
        principled.inputs['Roughness'].default_value = 0.18
        principled.inputs['Metallic'].default_value = 0.92

# Smooth shading.
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    try:
        for poly in o.data.polygons:
            poly.use_smooth = True
        if hasattr(o.data, "use_auto_smooth"):
            o.data.use_auto_smooth = True
            o.data.auto_smooth_angle = math.radians(35.0)
    except Exception:
        pass

# Recenter all remaining meshes around origin.
objs = [o for o in bpy.data.objects if o.type == 'MESH']
if objs:
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            mins.x = min(mins.x, w.x)
            mins.y = min(mins.y, w.y)
            mins.z = min(mins.z, w.z)
            maxs.x = max(maxs.x, w.x)
            maxs.y = max(maxs.y, w.y)
            maxs.z = max(maxs.z, w.z)
    center_world = (mins + maxs) * 0.5
    for o in objs:
        o.location -= center_world

bpy.ops.object.select_all(action='DESELECT')
for o in objs:
    o.select_set(True)
if objs:
    bpy.context.view_layer.objects.active = objs[0]

bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_lights=False,
    export_cameras=False,
)

print(f"Exported: {OUT_GLB}")



