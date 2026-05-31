# Original 3D Source Files

This folder contains the editable source assets used for the final GLB models in this project.

## Files

- `Coca_Cola.blend`
  - Main custom source for `coca_cola_bottle.glb`.
  - Edited and exported with custom script (`export_coca_cola_custom.py`).

- `cans_pack_source.blend`
  - Source blend file containing multiple can meshes.
  - Used to derive split/remix cans used in final gallery.

- `export_coca_cola_custom.py`
  - Blender Python export workflow.
  - Includes geometry dents, material conversion to glTF-friendly PBR nodes, and centered GLB export.

- `final_glb_blends/`
  - Individual `.blend` files exported from each final GLB for submission.
  - Includes materials, textures, and animations embedded from the GLB.
  - Files:
    - `coca_cola_bottle.blend`
    - `soda_can_crush.blend`
    - `soda_can_opening.blend`
    - `coke_can.blend`
    - `fanta_can.blend`
    - `sprite_can.blend`

## Final GLB Mapping

- `coca_cola_bottle.glb` <- `Coca_Cola.blend`
- `soda_can_crush.glb` <- improved can source pipeline
- `soda_can_opening.glb` <- improved can source pipeline
- `coke_can.glb` <- cans pack split source
- `fanta_can.glb` <- cans pack split source
- `sprite_can.glb` <- cans pack split source

