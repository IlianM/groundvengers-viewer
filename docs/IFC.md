# Bâtiment issu du fichier IFC

Le bâtiment affiché vient de `Modélisation_fictive.ifc` (équipe Domotique). Les fichiers `data/batiment.json`, `domotique.json`, `cyber.json` et `ia.json` sont **générés** par `scripts/ifc_vers_donnees.py` ; les modèles d'équipements (capteurs, réseau, nœuds IA) sont dans `scripts/gabarits/`.

## Régénérer

```bash
pip install ifcopenshell numpy
python3 scripts/ifc_vers_donnees.py chemin/vers/fichier.ifc
npm run check-data
```

## Ce que l'on tire de l'IFC

- 7 niveaux (SS2, SS1, R0, R1, R2, R3, toiture), leur altitude et leur emprise ;
- 307 pièces (`IfcSpace`) avec nom, surface et position, redressées de −2° pour aligner le bâtiment sur les axes ;
- 3 ascenseurs ; les gaines techniques (DF, GT, PLB…) sont ignorées.

Le type de pièce (bureau, réunion, open space, hall, sanitaire, parking…) est **déduit du nom** ; l'effectif maximum l'est de la surface.

## Limites à connaître

1. **L'IFC ne contient aucun capteur** : tous les emplacements sont des propositions par règles, à valider avec l'équipe Domotique.
2. **Surtout des bureaux individuels** : peu d'open spaces (niveau R3). Le récit « anonymat en open space » est moins parlant que sur l'ancienne maquette.
3. **Déplacements entre étages des occupants non adaptés** : les ascenseurs sont loin des open spaces, donc presque personne ne les prend. Les visiteurs depuis le hall et les cabines fonctionnent. Piste : graphe pièces/portes issu de l'IFC.
4. Murs et cloisons non repris de l'IFC (les pièces sont dessinées par leur rectangle).
5. L'en-tête de l'IFC cite des noms réels (organisme, services) : conservés tels que fournis.
