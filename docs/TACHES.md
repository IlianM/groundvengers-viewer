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
- [x] Scénarios d'intrusion animés en vue Cyber : 3 scénarios fictifs, lecture pas à pas ou automatique, chemin coupé en Minimum vital (F-21)
- [x] Caméra au clavier : flèches = déplacer, Maj + flèches = tourner, + / − = zoom
- [x] Recherche d'un équipement, d'une zone ou d'un modèle IA, avec saut de caméra (F-11, touche `/`)
- [x] URL partageable : vue, niveau, coupe, minimum vital, architecture IA, seuil et sélection dans le hash (F-12, bouton « Copier le lien »)

## À faire (Should / Could)
- [ ] F-02 Import IFC
- [ ] F-15 (chemin Niagara, partiel), F-24 (cycle de vie, partiel), F-26 : voir `BACKLOG.md`
- [ ] Faire valider les tracés de gaines (fictifs) par l'équipe Cyber, et ajouter les gaines du réseau GTB côté Domotique
- [ ] Tester le chargeur `.glb` avec un vrai export de l'équipe Domotique (jusqu'ici testé avec `docs/exemples/test-batiment.glb`)
- [ ] Faire valider par l'équipe Cyber les 3 scénarios d'intrusion (`scenarios` dans `data/cyber.json`, fictifs)
- [ ] Faire valider par l'équipe Cyber les poids du score de surface d'attaque (`POIDS_SURFACE` dans `src/scene/visibles.ts`)
- [ ] Remplacer les données fictives par les données réelles des équipes

## Règles
- Cocher ici dans le même commit que le code.
- Ne pas modifier `data/*.json` d'une autre équipe sans l'accord de son auteur.

## F-26 — Simulation d'une journée (fait)
Bouton **Journée** (haut de la vue 3D) : curseur horaire 00:00–24:00, lecture automatique (vitesse réglable dans Options › Démarrage), zones colorées et étiquetées par effectif simulé. Une zone **identifiable** (rouge) = au moins une personne présente, détection de présence active, moins de N personnes (seuil d'anonymat et Minimum vital respectés). Lien partageable : `#sim=1&h=9.5`.
Limite : profils fictifs et déterministes (`src/simulation.ts`), à remplacer par des mesures réelles. Ils illustrent la règle d'anonymat, ils ne prouvent rien.

## F-33 / F-34 — Personnages et ascenseurs (fait)
- **Personnages** : figures très simples, assises aux postes (certaines au téléphone), en réunion (une personne présente devant l'écran), à la cafétéria (tasse en main), à l'accueil, sur les canapés, ou traversant le hall. Leur nombre par zone suit la simulation d'une journée ; sans simulation, matinée type (10h30). Survol = tâche en cours, clic = fiche de la zone. Positions déduites du mobilier généré (`genererSieges`), donc elles suivent les changements d'effectif. Options › Rendu : afficher, vitesse.
- **Ascenseurs** : liste `ascenseurs` de `data/batiment.json` (position, taille, niveaux desservis). Cage vitrée par niveau + cabine qui monte et descend, portes coulissantes ; suit la vue éclatée et le filtre de niveau. Un ascenseur ajouté dans le JSON apparaît sans code.
- Limites : décor et animation purement illustratifs, aucun lien avec les capteurs réels ; les personnages ne changent pas d'étage.
