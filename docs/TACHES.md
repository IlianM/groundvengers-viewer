# Tâches

Liste simple, à cocher à la main. Une tâche = une branche ou un commit. Les identifiants F-xx renvoient à `BACKLOG.md`.

## Fait
- [x] Squelette Vite/React/Three, données JSON validées (Zod), CI + GitHub Pages
- [x] Vues Architecture, Domotique, Cyber, IA, Données, Occupant ; Minimum vital / Tout collecter
- [x] Mode présentation avec mouvements de caméra (F-31)
- [x] Coupe horizontale (F-04), volumes réseau en vue Cyber (F-16)
- [x] Mode sombre, décor (herbe, arbres, bâtiments au loin) et meubles, chacun désactivable
- [x] Boutons Recentrer / Dessus / Façade
- [x] Vue éclatée : les niveaux s'écartent avec animation (F-05)
- [x] Option « Éclater aussi les pièces » : chaque pièce s'écarte du centre, avec ses meubles, équipements et gaines
- [x] Gaines, chemins de câbles et montante en vue Cyber, avec fiche détail et recherche (F-18)
- [x] Rectangles du bâtiment : option permanente dans Options, et masqués automatiquement quand les pièces s'écartent
- [x] Modèle 3D : chargeur .glb testé, objets nommés comme un id cliquables avec surbrillance (NIV-xx, zones, équipements, gaines), glisser-déposer / bouton de chargement (F-32)
- [x] Vue Risques : matrice impact × probabilité cliquable, équipements concernés entourés selon la criticité (F-30)
- [x] Score de surface d'attaque : indicateur du bandeau et détail du calcul en vue Cyber, tout collecter contre minimum vital (F-20)
- [x] Caméra au clavier : flèches = déplacer, Maj + flèches = tourner, + / − = zoom
- [x] Recherche d'un équipement, d'une zone ou d'un modèle IA, avec saut de caméra (F-11, touche `/`)
- [x] URL partageable : vue, niveau, coupe, minimum vital, architecture IA, seuil et sélection dans le hash (F-12, bouton « Copier le lien »)

## À faire (Should / Could)
- [ ] F-02 Import IFC
- [ ] F-15 (chemin Niagara, partiel), F-21, F-24 (cycle de vie, partiel), F-26 : voir `BACKLOG.md`
- [ ] Faire valider les tracés de gaines (fictifs) par l'équipe Cyber, et ajouter les gaines du réseau GTB côté Domotique
- [ ] Tester le chargeur `.glb` avec un vrai export de l'équipe Domotique (jusqu'ici testé avec `docs/exemples/test-batiment.glb`)
- [ ] Faire valider par l'équipe Cyber les poids du score de surface d'attaque (`POIDS_SURFACE` dans `src/scene/visibles.ts`)
- [ ] Remplacer les données fictives par les données réelles des équipes

## Règles
- Cocher ici dans le même commit que le code.
- Ne pas modifier `data/*.json` d'une autre équipe sans l'accord de son auteur.
