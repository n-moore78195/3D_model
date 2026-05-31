import bpy
import bmesh
from mathutils import Vector

path = r"e:\program\3D易拉罐\3D_model\models\coca_cola_custom.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=path)

for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    name = obj.name.lower()
    if 'cola' not in name and 'liquid' not in name:
        continue

    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)

    # connected components
    unvisited = set(bm.verts)
    islands = 0
    while unvisited:
        islands += 1
        stack = [next(iter(unvisited))]
        unvisited.remove(stack[0])
        while stack:
            v = stack.pop()
            for e in v.link_edges:
                ov = e.other_vert(v)
                if ov in unvisited:
                    unvisited.remove(ov)
                    stack.append(ov)

    # boundary edges
    boundary = sum(1 for e in bm.edges if len(e.link_faces) == 1)
    nonmanifold = sum(1 for e in bm.edges if len(e.link_faces) != 2)

    # basic radial variance check
    coords = [v.co.copy() for v in bm.verts]
    c = Vector((sum(v.x for v in coords)/len(coords), sum(v.y for v in coords)/len(coords), sum(v.z for v in coords)/len(coords)))
    rs = sorted(((v-c).length for v in coords))
    p20 = rs[int(len(rs)*0.2)]
    p80 = rs[int(len(rs)*0.8)]

    print('OBJ', obj.name)
    print(' verts', len(bm.verts), 'faces', len(bm.faces), 'islands', islands)
    print(' boundary_edges', boundary, 'nonmanifold_edges', nonmanifold)
    print(' radial p20/p80', round(p20,4), round(p80,4))
    bm.free()
