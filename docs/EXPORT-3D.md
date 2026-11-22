# Export du modèle 3D

Format cible : **glTF binaire (.glb)**.

1. SketchUp : exporter en IFC si la version le permet, sinon en COLLADA (.dae) ou via une extension d'export glTF.
2. everBIM reste la source BIM sur le fichier IFC.
3. Convertir et alléger en .glb (Blender, ou `npx @gltf-transform/cli optimize siege.glb siege-opt.glb`).
4. Déposer dans `public/models/` et mettre `"modele": "siege.glb"` dans `data/batiment.json`.

## Nommage des objets

Chaque objet cliquable porte comme nom de composant son identifiant : `NIV-R1`, `ZONE-R1-OPEN-A`, `CAP-CO2-R1-01`, `FW-01`…
Les suffixes de doublons de Blender (`FW-01.001`) sont acceptés. Un objet nommé `NIV-R1` sélectionne le niveau R1 ; les autres noms d'identifiants (équipement, zone, gaine) ouvrent leur fiche et se surlignent. Les objets sans identifiant (murs, sol…) ne réagissent pas au clic.

Un exemple minimal est dans `docs/exemples/test-batiment.glb` (script : `creer-glb-test.py`).

Pour essayer un export sans toucher au dépôt : menu Options → « Charger un fichier .glb… », ou glisser-déposer le fichier sur la vue 3D (il reste local au navigateur, rien n'est envoyé). Les meubles générés disparaissent alors, et l'éclatement des niveaux et des pièces ne s'applique pas au modèle (seulement aux données).

Repère : origine dans un coin du bâtiment, x sur la largeur, z sur la profondeur, y vers le haut, en mètres. L'appli centre le bâtiment sur l'emprise de `batiment.json`.

Versions de SketchUp et everBIM de l'équipe : à confirmer.
