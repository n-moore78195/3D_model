import bpy
for mat in bpy.data.materials:
    if not mat.use_nodes or not mat.node_tree:
        continue
    print('\nMAT', mat.name)
    for node in mat.node_tree.nodes:
        print(' node', node.name, node.type)
    for l in mat.node_tree.links:
        print(' link', l.from_node.name, l.from_socket.name, '->', l.to_node.name, l.to_socket.name)
