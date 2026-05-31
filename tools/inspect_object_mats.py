import bpy
for o in bpy.data.objects:
    if o.type!='MESH':
        continue
    print('\nOBJ', o.name)
    for i,slot in enumerate(o.material_slots):
        m=slot.material
        print(' slot', i, m.name if m else None)
