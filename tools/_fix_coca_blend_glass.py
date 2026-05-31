# -*- coding: utf-8 -*-
import bpy

path=r"e:\program\3D易拉罐\3D_model\submission\original_3d_files\final_glb_blends\coca_cola_custom.blend"

bpy.ops.wm.open_mainfile(filepath=path)
scene=bpy.context.scene
# Try Eevee Next first if available
if 'BLENDER_EEVEE_NEXT' in bpy.context.preferences.addons.keys() or hasattr(scene, 'eevee'):
    try:
        scene.render.engine='BLENDER_EEVEE_NEXT'
    except Exception:
        scene.render.engine='BLENDER_EEVEE'
else:
    scene.render.engine='BLENDER_EEVEE'

eevee=getattr(scene, 'eevee', None)
if eevee:
    if hasattr(eevee, 'use_ssr'):
        eevee.use_ssr=True
    if hasattr(eevee, 'use_ssr_refraction'):
        eevee.use_ssr_refraction=True
    if hasattr(eevee, 'ssr_thickness'):
        eevee.ssr_thickness=2.0
    if hasattr(eevee, 'use_refraction'):
        eevee.use_refraction=True

body=bpy.data.objects.get('Bottle')
mat=bpy.data.materials.get('Material.002')
if mat:
    mat.use_nodes=True
    mat.blend_method='BLEND'
    if hasattr(mat, 'use_screen_refraction'):
        mat.use_screen_refraction=True
    if hasattr(mat, 'refraction_depth'):
        mat.refraction_depth=0.03
    mat.use_backface_culling=False

    nt=mat.node_tree
    nodes=nt.nodes
    links=nt.links
    for n in list(nodes):
        if n.type not in {'BSDF_PRINCIPLED','OUTPUT_MATERIAL'}:
            nodes.remove(n)
    principled=None
    out=None
    for n in nodes:
        if n.type=='BSDF_PRINCIPLED':
            principled=n
        if n.type=='OUTPUT_MATERIAL':
            out=n
    if not out:
        out=nodes.new('ShaderNodeOutputMaterial'); out.location=(320,0)
    if not principled:
        principled=nodes.new('ShaderNodeBsdfPrincipled'); principled.location=(0,0)
    if not any(l.to_node==out for l in links):
        links.new(principled.outputs['BSDF'], out.inputs['Surface'])

    if 'Base Color' in principled.inputs:
        principled.inputs['Base Color'].default_value=(0.98,0.99,1.0,1.0)
    if 'Roughness' in principled.inputs:
        principled.inputs['Roughness'].default_value=0.08
    if 'Metallic' in principled.inputs:
        principled.inputs['Metallic'].default_value=0.0
    if 'Specular' in principled.inputs:
        principled.inputs['Specular'].default_value=0.1
    if 'IOR' in principled.inputs:
        principled.inputs['IOR'].default_value=1.45
    if 'Transmission Weight' in principled.inputs:
        principled.inputs['Transmission Weight'].default_value=1.0
    elif 'Transmission' in principled.inputs:
        principled.inputs['Transmission'].default_value=1.0
    if 'Alpha' in principled.inputs:
        principled.inputs['Alpha'].default_value=1.0

if body and mat:
    body.data.materials.clear()
    body.data.materials.append(mat)
    for poly in body.data.polygons:
        poly.material_index=0

bpy.ops.wm.save_mainfile()
print('Updated Eevee glass settings in', path)
