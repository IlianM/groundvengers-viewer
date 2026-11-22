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
- [ ] (voir docs/VALIDATION.md) Faire valider les tracés de gaines (fictifs) par l'équipe Cyber, et ajouter les gaines du réseau GTB côté Domotique
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

## F-35 / F-36 — Îlots, comportements, fiche personne (fait)
- **Mobilier** : open spaces en îlots de 4 bureaux face à face séparés par des allées, avec coin café et imprimante ; cafétéria en quinconce. Postes à 1, 2 ou 3 écrans, écran ultrawide ou ordinateur portable (variante stable par bureau). Générateur : `src/scene/Mobilier.tsx`.
- **Comportements** (`src/scene/personnage/comportement.ts`) : fonction pure du temps. Au poste : taper, souris, bras croisés, réflexion, téléphone, lecture, étirements, café, discussion. Toutes les 80–120 s environ, certaines personnes se lèvent et rejoignent le coin café, l'imprimante ou un coin discussion en suivant uniquement les allées ; en bureau individuel, elles téléphonent en marchant ou s'étirent.
- **Fiche personne** (clic sur un personnage) : activité en direct, agenda du jour cohérent avec l'endroit où se trouve la personne, préférences de température et de lumière comparées aux valeurs simulées de la zone, bouton « Centrer la caméra ».
- **Idée du projet** : la fiche oppose les deux modes. En *Minimum vital*, agenda et préférences sont verrouillés (données identifiantes) ; le bloc « Ce que coûte le minimalisme » compare la part de personnes satisfaites avec une consigne unique (21 °C) et avec une consigne calculée sur les préférences. À chiffrer et valider avec l'équipe Domotique : tout est fictif (noms, agendas, préférences, température et lumière simulées).
- Limites : les personnages ne changent pas d'étage ni de zone ; les déplacements vers le café et l'imprimante n'existent que dans les open spaces.

## Réglage « Nombre de personnes » (fait)
Options › Rendu › Vie du bâtiment : on règle un nombre (curseur ou saisie) puis on clique sur **Appliquer** ; **Revenir à la simulation** rétablit les effectifs automatiques. Le total imposé est réparti entre les zones au prorata de l'occupation simulée (à la capacité si le bâtiment est vide), plafonné à l'effectif max de chaque zone (114 au total). Il alimente les personnages, les étiquettes de zones, la barre de simulation et l'alerte d'anonymat. Réglage `effectifForce`, inclus dans l'export de configuration.

## Capture et rapport (fait)
- **Capture** (boutons en haut de la vue 3D) : image PNG de la scène 3D, sans les étiquettes ni les panneaux.
- **Rapport** (Options › Configuration) : fichier Markdown de l'état courant : indicateurs dans les deux modes avec écarts, zones non anonymes selon le seuil, occupation simulée, cinq risques les plus critiques, statut des preuves. Prévu pour être collé dans un compte rendu ; les données restent fictives et le rapport le rappelle.

## Usagers d'ascenseur (fait)
Jusqu'à 4 personnes en plus (une par tranche de 15 personnes présentes) entrent par la porte du hall, attendent devant l'ascenseur, montent à un autre niveau, patientent quelques secondes, redescendent et ressortent. Ils ne sont **pas** comptés dans l'effectif des zones, et leur fiche n'est pas ouverte au clic (survol seulement). Horaire des cabines et scénario des usagers : `src/scene/personnage/ascenseur.ts` et `comportement.ts` (`construireNavette`). Ils n'embarquent que porte ouverte (vérifié par calcul). Même horloge que les personnages : la vitesse des personnages règle aussi les cabines.
Correctif au passage : les piétons du hall traversaient la cage d'ascenseur du rez-de-chaussée ; leur boucle est décalée vers l'ouest.

## F-15 / F-24 — Cycle de vie et chemin de la donnée (fait)
Dans la fiche de chaque équipement : frise **Mesure → Transit → Supervision → Conservation → Effacement**, calculée en suivant les liens du réseau jusqu'au serveur le plus proche (Niagara en priorité). Exemple : Compteur TGBT → passerelle iSMA (M-Bus) → serveur Niagara (Ethernet), puis conservation 10 ans. Le bouton « Suivre la donnée en 3D » dessine ce chemin, avec un paquet qui voyage. En Minimum vital, une donnée non conservée est barrée. Code : `src/parcours.ts`, `src/ui/Parcours.tsx`.
Limite : durées de conservation reprises des textes de `data/*.json`, non vérifiées juridiquement (RGPD, OPERAT).
Aussi : les personnages ne s'affichent plus par défaut que dans les vues Architecture et Occupant (option « Personnages dans toutes les vues »). Correctif CSS : la classe de la fiche personne écrasait le tableau du score de surface.

Checklist par équipe (Cyber, Domotique, IA, preuves) : `docs/VALIDATION.md`.
