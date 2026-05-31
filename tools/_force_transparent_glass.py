# -*- coding: utf-8 -*-
import bpy

path=r"e:\program\3D易拉罐\3D_model\submission\original_3d_files\final_glb_blends\coca_cola_custom.blend"

bpy.ops.wm.open_mainfile(filepath=path)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'

body=bpy.data.objects.get('Bottle')
mat=bpy.data.materials.get('Material.002')
if mat:
    mat.use_nodes=True
    nt=mat.node_tree
    nodes=nt.nodes
    links=nt.links
    nodes.clear()

    out=nodes.new('ShaderNodeOutputMaterial'); out.location=(420,0)
    mix=nodes.new('ShaderNodeMixShader'); mix.location=(220,0)
    glass=nodes.new('ShaderNodeBsdfPrincipled'); glass.location=(0,80)
    transp=nodes.new('ShaderNodeBsdfTransparent'); transp.location=(0,-120)

    # Mix to force visible transparency in viewport
    mix.inputs['Fac'].default_value = 0.4  # 0 = fully glass, 1 = fully transparent

    links.new(glass.outputs['BSDF'], mix.inputs[1])
    links.new(transp.outputs['BSDF'], mix.inputs[2])
    links.new(mix.outputs['Shader'], out.inputs['Surface'])

    if 'Base Color' in glass.inputs:
        glass.inputs['Base Color'].default_value=(0.98,0.99,1.0,1.0)
    if 'Roughness' in glass.inputs:
        glass.inputs['Roughness'].default_value=0.08
    if 'Metallic' in glass.inputs:
        glass.inputs['Metallic'].default_value=0.0
    if 'Specular' in glass.inputs:
        glass.inputs['Specular'].default_value=0.1
    if 'IOR' in glass.inputs:
        glass.inputs['IOR'].default_value=1.45
    if 'Transmission Weight' in glass.inputs:
        glass.inputs['Transmission Weight'].default_value=1.0
    elif 'Transmission' in glass.inputs:
        glass.inputs['Transmission'].default_value=1.0

    mat.blend_method='BLEND'
    mat.use_backface_culling=False

    # Viewport display fallback
    mat.diffuse_color=(1.0,1.0,1.0,0.2)

if body and mat:
    body.data.materials.clear()
    body.data.materials.append(mat)
    for poly in body.data.polygons:
        poly.material_index=0

bpy.ops.wm.save_mainfile()
print('Forced transparent mix in', path)
