# GroundVengers Viewer

Application web du projet **Bâtiment intelligent par minimalisme** (Project Lab). Elle montre le siège fictif GroundVengers en 3D avec sept vues : Architecture, Domotique, Cyber, IA, Données, Occupant et Risques.

Pour découvrir l'appli : le bouton **Visite guidée** (en haut) parcourt toutes les fonctions en lecture automatique ; **Comparer** affiche côte à côte Tout collecter et Minimum vital.

Site statique : pas de serveur, pas de cookie, pas de traceur. Toutes les personnes et données sont fictives.

## Lancer en local

```bash
npm install
npm run dev          # http://localhost:5173
npm run check-data   # vérifie les fichiers data/*.json
npm run build        # produit dist/
npm test             # tests unitaires (voir docs/TESTS.md)
npm run test:e2e     # test de fumée dans un navigateur (après un build)
npm run test:visuel  # captures de référence (local)
```

## Relier le dépôt à GitHub (une seule fois)

1. Sur GitHub, créer un dépôt **vide** `groundvengers-viewer` (sans README).
2. Dans ce dossier :
   ```bash
   git remote add origin https://github.com/<ton-compte>/groundvengers-viewer.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Source : GitHub Actions**.
4. Ajouter Léo : **Settings → Collaborators → Add people**.

À chaque push sur `main`, l'action vérifie les données, lance les tests (`docs/TESTS.md`), construit et publie le site sur `https://<ton-compte>.github.io/groundvengers-viewer/`. Sur une pull request, elle vérifie seulement.

## Où est quoi

```
data/            ← les équipes modifient surtout ici
  batiment.json    niveaux, zones, effectifs (Domotique)
  domotique.json   capteurs, automates, compteurs, bus (Domotique)
  cyber.json       réseaux, firewall, Wi-Fi, baies (Cyber)
  ia.json          nœuds IA Edge / central (IA)
  preuves.json     preuves et matrice de risques (tous)
  scenes.json      mode présentation (tous)
public/models/   modèle 3D exporté (.glb), quand il existera
src/schema/      contrat de données (Zod) — ne change qu'en weekly
src/data.ts      chargement, validation, contrôles croisés
src/views/       définition des 6 vues (couleurs, filtres, légendes)
src/scene/       rendu 3D (Three.js / React Three Fiber)
src/ui/          panneaux, fiche détail, indicateurs, présentation
docs/            contribuer, schéma, export 3D, glossaire, backlog
```

## Options (barre verte, en haut)

Menu **Options** : mode sombre, rectangles du bâtiment (dalles et enveloppe, masqués automatiquement quand les pièces s'écartent), chargement d'un `.glb` local (ou glisser-déposer sur la vue 3D), et décor activable séparément (herbe/route, arbres, bâtiments au loin, meubles). Les choix sont gardés dans le navigateur. Le décor est grossier et n'influe pas sur les indicateurs. Le panneau de gauche propose aussi la **coupe** (masquer les niveaux au-dessus du niveau choisi) ; en vue Cyber, le calque **Volumes réseau** montre les réseaux GTB isolé et bureautique par niveau.

## Risques et surface d'attaque

La vue **Risques** affiche la matrice impact × probabilité (données de `preuves.json`). Un clic sur un risque isole les équipements concernés, entourés d'un anneau selon la criticité (impact × probabilité : élevée à partir de 6). Le **score de surface d'attaque** est dans le bandeau du bas, et son détail en vue Cyber : 3 × points d'entrée + 2 × flux vers Internet + 1 × protocoles distincts + 2 × équipements à donnée identifiante. La formule est indicative ; changer les poids se fait dans `POIDS_SURFACE`.

## Scénarios d'intrusion

En vue Cyber, le panneau **Scénarios d'intrusion** rejoue une attaque pas à pas : une impulsion rouge suit le chemin de l'attaquant, un « ✖ bloqué » s'affiche quand le firewall l'arrête. Avec **Minimum vital**, un chemin qui passe par un équipement non collecté (passerelle cloud, caméra) est coupé : l'équipement apparaît en fantôme. Les scénarios sont des données (`scenarios` dans `data/cyber.json`) ; l'URL partagée garde le scénario et l'étape.

## Caméra

Souris : clic gauche tourner, clic droit déplacer, molette zoom. Clavier : **flèches** pour se déplacer, **Maj + flèches** pour tourner et incliner, **+ / −** pour zoomer. Boutons Recentrer, Dessus, Façade. La case **Vue éclatée** (panneau de gauche) écarte les niveaux les uns des autres, et **Éclater aussi les pièces** écarte chaque pièce de son voisin ; les deux se combinent.

En vue Cyber, le calque **Gaines et chemins de câbles** montre les chemins de câbles par réseau et la montante technique ; un clic ouvre la fiche (liens transportés). Les tracés actuels sont fictifs, à faire valider par l'équipe Cyber.

## Recherche et lien partageable

La barre de recherche (en haut à gauche de la vue 3D, touche `/`) trouve un équipement, une zone ou un modèle IA par nom, identifiant, type, protocole ou configuration. Un clic règle la vue, le niveau et les calques pour le montrer, puis place la caméra dessus. Le bouton **Copier le lien** copie une URL qui rouvre la même vue, le même niveau et la même sélection (le thème et le décor restent personnels).

## Bâtiment 3D

Pour le MVP, `batiment.json` a `"modele": null` : le bâtiment est généré par le code à partir de l'emprise et des niveaux. Quand l'équipe Domotique fournit un `.glb`, le déposer dans `public/models/` et mettre `"modele": "siege.glb"`. Voir `docs/EXPORT-3D.md`.

## Stack

Vite, React, TypeScript, Three.js (React Three Fiber + drei), Zustand, Zod. Styles en CSS simple (`src/styles.css`).
