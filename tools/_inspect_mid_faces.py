# -*- coding: utf-8 -*-
import bpy, math
from mathutils import Vector
p=r"e:\program\3D易拉罐\3D_model\models\coca_cola_custom.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=p)

for o in bpy.data.objects:
    if o.type!='MESH':
        continue
    print('\nOBJ',o.name)
    me=o.data
    ys=[]
    rec=[]
    for poly in me.polygons:
        c=poly.center
        n=poly.normal
        rec.append((poly.area,c.y,n.y))
        ys.append(c.y)
    ys_sorted=sorted(ys)
    if not ys_sorted:
        continue
    ylo=ys_sorted[int(len(ys_sorted)*0.1)]
    yhi=ys_sorted[int(len(ys_sorted)*0.9)]
    mids=[r for r in rec if ylo < r[1] < yhi and abs(r[2])>0.6]
    mids=sorted(mids,key=lambda x:x[0],reverse=True)
    print(' mid-horizontal count',len(mids),' y10',round(ylo,4),' y90',round(yhi,4))
    for a,y,ny in mids[:20]:
        print('  area',round(a,6),'y',round(y,6),'ny',round(ny,6))
