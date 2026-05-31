# CanLab 3D Studio

Interactive 3D web app showcasing six final soda-can and bottle models with dynamic actions, lighting controls, and a responsive UI.

## Features

- Model gallery with 6 final GLB assets
- Dynamic animation buttons (clip-driven when available)
- Wireframe toggle and lighting controls
- Camera centering + orbit controls
- Responsive left/right info panels and action dock
- About page with originality statement, references, and media block

## Runtime Models

Located in `3D_model/models`:

- `coca_cola_bottle.glb`
- `soda_can_crush.glb`
- `soda_can_opening.glb`
- `coke_can.glb`
- `fanta_can.glb`
- `sprite_can.glb`

## Project Structure

```
index.html
about.html
styles.css
app.js
models/
submission/
```

## How To Run

```powershell
cd e:\program\3D易拉罐\3D_model
python -m http.server 8000
```

Open `http://localhost:8000/index.html`.

## Credits

- Three.js
- Font Awesome
- Khronos glTF

