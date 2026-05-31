# -*- coding: utf-8 -*-
import bpy, math
from collections import defaultdict
from mathutils import Vector
p=r"e:\program\3D易拉罐\3D_model\models\coca_cola_custom.glb"
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=p)

for o in bpy.data.objects:
    if o.type!='MESH':
        continue
    me=o.data
    # dominant axis in local space
    xs=[v.co.x for v in me.vertices]; ys=[v.co.y for v in me.vertices]; zs=[v.co.z for v in me.vertices]
    sx=max(xs)-min(xs); sy=max(ys)-min(ys); sz=max(zs)-min(zs)
    if sx>=sy and sx>=sz:
        ax='x'; axis=Vector((1,0,0)); min_h=min(xs); max_h=max(xs)
    elif sz>=sx and sz>=sy:
        ax='z'; axis=Vector((0,0,1)); min_h=min(zs); max_h=max(zs)
    else:
        ax='y'; axis=Vector((0,1,0)); min_h=min(ys); max_h=max(ys)

    bins=defaultdict(lambda:[0,0.0])
    for poly in me.polygons:
        hs=[]
        for vid in poly.vertices:
            v=me.vertices[vid].co
            hs.append(v.x if ax=='x' else (v.z if ax=='z' else v.y))
        hmax=max(hs); hmin=min(hs)
        if (hmax-hmin) > 0.0015:
            continue
        n=poly.normal.normalized()
        d=abs(n.dot(axis))
        if d < 0.94:
            continue
        hc=sum(hs)/len(hs)
        t=(hc-min_h)/max(max_h-min_h,1e-6)
        # ignore top/bottom ends
        if t<0.12 or t>0.88:
            continue
        key=round(hc,3)
        bins[key][0]+=1
        bins[key][1]+=poly.area

    ranked=sorted(bins.items(), key=lambda kv: (kv[1][0],kv[1][1]), reverse=True)
    print('\nOBJ',o.name,'axis',ax,'span',round(max_h-min_h,4),'candidate_levels',len(ranked))
    for k,(cnt,area) in ranked[:12]:
        print('  h',k,'count',cnt,'area',round(area,4))
