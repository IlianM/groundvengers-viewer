# Export du modèle 3D

Format cible : **glTF binaire (.glb)**.

1. SketchUp : exporter en IFC si la version le permet, sinon en COLLADA (.dae) ou via une extension d'export glTF.
2. everBIM reste la source BIM sur le fichier IFC.
3. Convertir et alléger en .glb (Blender, ou `npx @gltf-transform/cli optimize siege.glb siege-opt.glb`).
4. Déposer dans `public/models/` et mettre `"modele": "siege.glb"` dans `data/batiment.json`.

## Nommage des objets

Chaque objet cliquable porte comme nom de composant son identifiant : `NIV-R1`, `ZONE-R1-OPEN-A`, `CAP-CO2-R1-01`, `FW-01`…
Repère : origine dans un coin du bâtiment, x sur la largeur, z sur la profondeur, y vers le haut, en mètres. L'appli centre le bâtiment sur l'emprise de `batiment.json`.

Versions de SketchUp et everBIM de l'équipe : à confirmer.
