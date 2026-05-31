import bpy
print('--- Images ---')
for img in bpy.data.images:
    print(img.name, 'filepath=', img.filepath, 'packed=', bool(img.packed_file))
print('\n--- Materials / Tex Nodes ---')
for mat in bpy.data.materials:
    if not mat.use_nodes or not mat.node_tree:
        continue
    print('\nMAT', mat.name)
    for n in mat.node_tree.nodes:
        if n.type == 'TEX_IMAGE':
            img = n.image
            print(' TEX', n.name, 'img=', img.name if img else None, 'filepath=', img.filepath if img else None, 'packed=', bool(img and img.packed_file))
