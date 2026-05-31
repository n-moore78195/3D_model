# -*- coding: utf-8 -*-
import bpy
from mathutils import Vector
p=r"e:\program\3D易拉罐\3D_model\models\Coca_Cola.blend"
bpy.ops.wm.open_mainfile(filepath=p)
for o in bpy.data.objects:
    if o.type!='MESH':
        continue
    bb=[o.matrix_world @ Vector(c) for c in o.bound_box]
    minv=Vector((min(v.x for v in bb),min(v.y for v in bb),min(v.z for v in bb)))
    maxv=Vector((max(v.x for v in bb),max(v.y for v in bb),max(v.z for v in bb)))
    size=maxv-minv
    mats=[s.material.name if s.material else None for s in o.material_slots]
    print(o.name,'size',tuple(round(float(v),4) for v in size),'mats',mats)
