# GroundVengers Viewer

Application web du projet **Bâtiment intelligent par minimalisme** (Project Lab). Elle montre le siège fictif GroundVengers en 3D avec six vues : Architecture, Domotique, Cyber, IA, Données et Occupant.

Site statique : pas de serveur, pas de cookie, pas de traceur. Toutes les personnes et données sont fictives.

## Lancer en local

```bash
npm install
npm run dev          # http://localhost:5173
npm run check-data   # vérifie les fichiers data/*.json
npm run build        # produit dist/
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

À chaque push sur `main`, l'action vérifie les données, construit et publie le site sur `https://<ton-compte>.github.io/groundvengers-viewer/`. Sur une pull request, elle vérifie seulement.

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

Menu **Options** : mode sombre, et décor activable séparément (herbe/route, arbres, bâtiments au loin, meubles). Les choix sont gardés dans le navigateur. Le décor est grossier et n'influe pas sur les indicateurs. Le panneau de gauche propose aussi la **coupe** (masquer les niveaux au-dessus du niveau choisi) ; en vue Cyber, le calque **Volumes réseau** montre les réseaux GTB isolé et bureautique par niveau.

## Bâtiment 3D

Pour le MVP, `batiment.json` a `"modele": null` : le bâtiment est généré par le code à partir de l'emprise et des niveaux. Quand l'équipe Domotique fournit un `.glb`, le déposer dans `public/models/` et mettre `"modele": "siege.glb"`. Voir `docs/EXPORT-3D.md`.

## Stack

Vite, React, TypeScript, Three.js (React Three Fiber + drei), Zustand, Zod. Styles en CSS simple (`src/styles.css`).
