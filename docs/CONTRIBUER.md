# Contribuer

## Ajouter un équipement

1. Ouvrir le fichier de son équipe dans `data/` (`domotique.json`, `cyber.json` ou `ia.json`).
2. Copier un équipement voisin et changer au minimum : `id`, `nom`, `niveau`, `zone`, `position`, `donnee`.
3. `position` = `[x, hauteur, z]` en mètres, repère du bâtiment : x de 0 à 30 (largeur), z de 0 à 18 (profondeur), hauteur au-dessus de la dalle de l'étage.
4. `npm run check-data` : doit afficher « Données valides ».
5. `npm run dev` et vérifier dans la vue concernée.

## Ajouter un lien (bus, câble, flux)

Ajouter un objet dans `liens` : `de` = id de départ, `vers` = liste d'ids. Le `protocole` donne la couleur en vue Domotique. `"autorise_par_firewall": false` dessine un flux bloqué en rouge pointillé.

## Ajouter une scène de présentation

Ajouter un objet dans `data/scenes.json` : `titre`, `texte`, `vue`, `niveau` (ou `null`), `minimum_vital`, `architecture_ia`.

## Conventions

- Identifiants : `TYPE-SOUSTYPE-NIVEAU-NN` en majuscules (`CAP-CO2-R1-01`), identiques dans le modèle 3D, le JSON et la doc.
- Une branche par carte : `feat/F-14-liaisons-protocole`.
- Commits préfixés : `F-14: couleurs par protocole`.
- Pull request relue par l'autre développeur ; `main` toujours déployable.
- Toute modification de `src/schema/` se décide en weekly.
