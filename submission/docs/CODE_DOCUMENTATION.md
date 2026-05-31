# Code Documentation

## Project Overview

This project is an interactive Three.js web app showcasing 6 final soda-can GLB models with:

- model gallery switching
- dynamic animation/action buttons (clip-driven when available)
- wireframe and lighting controls
- camera reset/centering and orbit interaction
- responsive UI panels and about/documentation section

## Final Runtime Models

All runtime models are stored in `3D_model/models`:

1. `coca_cola_bottle.glb`
2. `soda_can_crush.glb`
3. `soda_can_opening.glb`
4. `coke_can.glb`
5. `fanta_can.glb`
6. `sprite_can.glb`

## Key Files

- `index.html`
  - Page structure and UI layout.
  - Includes top toolbar, model gallery panel, info panel, and action dock.

- `styles.css`
  - Visual design, responsive layout, panel behaviors, and control styles.

- `app.js`
  - Scene/camera/renderer setup.
  - GLB loading pipeline.
  - Per-model metadata (`MODEL_LIBRARY`).
  - Dynamic animation clip actions and fallback interactions.
  - Wireframe/lighting/camera and gallery control logic.

- `about.html`
  - About page with originality statement, references, media block, and site map.

## Modeling + Export Notes

### Coca-Cola Bottle Model

`coca_cola_bottle.glb` is exported from `Coca_Cola.blend` using `tools/export_coca_cola_custom.py`.

Main modifications:

- removed floor helper mesh
- subtle body dents added to main body mesh
- glTF-friendly PBR material conversion for label textures
- smooth shading and centered export

### GLB Normalization

All final GLB models were normalized and centered for stable scene placement.

## Interaction Logic

- If GLB contains animation clips: UI generates `Play <clip>` buttons automatically.
- If no clips: fallback actions are enabled (`Squash`, `Pull Tab`, `Twist`, `Detail`) per model config.
- Clicking the model in viewport triggers main clip or first fallback action.

## How To Run

Use any local static server in `3D_model` root, for example:

```powershell
cd e:\program\3D易拉罐\3D_model
python -m http.server 8000
```

Open:

- `http://localhost:8000/index.html`

## References

- Three.js: https://threejs.org/
- glTF Specification: https://www.khronos.org/gltf/
- Font Awesome: https://fontawesome.com/


