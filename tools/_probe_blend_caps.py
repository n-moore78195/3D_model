# -*- coding: utf-8 -*-
import bpy, bmesh
from collections import defaultdict
from mathutils import Vector
p=r"e:\program\3D易拉罐\3D_model\models\Coca_Cola.blend"
bpy.ops.wm.open_mainfile(filepath=p)
body=bpy.data.objects.get('Bottle')
me=body.data
bm=bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
xs=[v.co.x for v in bm.verts]; ys=[v.co.y for v in bm.verts]; zs=[v.co.z for v in bm.verts]
min_v=Vector((min(xs),min(ys),min(zs))); max_v=Vector((max(xs),max(ys),max(zs))); size=max_v-min_v
if size.x>=size.y and size.x>=size.z:
    axis='x'; axis_vec=Vector((1,0,0)); hmin,hmax=min_v.x,max_v.x
elif size.z>=size.x and size.z>=size.y:
    axis='z'; axis_vec=Vector((0,0,1)); hmin,hmax=min_v.z,max_v.z
else:
    axis='y'; axis_vec=Vector((0,1,0)); hmin,hmax=min_v.y,max_v.y
hspan=max(hmax-hmin,1e-6)
flat_eps=max(hspan*0.0008,1e-4)
print('axis',axis,'hspan',hspan,'flat_eps',flat_eps,'hmin',hmin,'hmax',hmax)

def get_h(v):
    return v.x if axis=='x' else (v.z if axis=='z' else v.y)

bins=defaultdict(list); area=defaultdict(float)
for f in bm.faces:
    hs=[get_h(v.co) for v in f.verts]
    if (max(hs)-min(hs))>flat_eps:
        continue
    n=f.normal.normalized()
    if abs(n.dot(axis_vec))<0.94:
        continue
    hc=sum(hs)/len(hs)
    t=(hc-hmin)/hspan
    if t<0.12 or t>0.88:
        continue
    key=round(hc,4)
    bins[key].append(f)
    area[key]+=f.calc_area()

rank=sorted(bins.items(), key=lambda kv:(len(kv[1]),area[kv[0]]), reverse=True)
print('candidate bins',len(rank))
for k,v in rank[:20]:
    t=(k-hmin)/hspan
    print(' h',k,'t',round(t,4),'count',len(v),'area',round(area[k],4))

bm.free()
