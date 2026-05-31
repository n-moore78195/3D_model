# -*- coding: utf-8 -*-
import bpy
import sys

argv = sys.argv
argv = argv[argv.index('--') + 1:] if '--' in argv else []
if len(argv) < 2:
    raise SystemExit('Usage: blender -b --python export_glb_to_blend.py -- <input_glb> <output_blend>')

input_glb = argv[0]
output_blend = argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=input_glb)

# Save once, then try to make paths relative and save again.
bpy.ops.wm.save_as_mainfile(filepath=output_blend)
try:
    bpy.ops.file.make_paths_relative()
    bpy.ops.wm.save_mainfile()
except Exception:
    pass

print(f'Saved: {output_blend}')
