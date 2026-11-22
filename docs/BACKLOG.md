# Backlog — cartes F-xx

Reprend la carte des fonctionnalités de la proposition. ✅ = présent dans le squelette v0.1 (à affiner), ⬜ = à faire.

| ID | Fonctionnalité | Priorité | État |
| --- | --- | --- | --- |
| F-01 | Charger le bâtiment (glTF / GLB) | Must | ✅ chargeur testé avec un .glb de test (docs/exemples), clic sur les objets nommés comme un id ; reste à tester avec le vrai export |
| F-02 | Import IFC | Should | ⬜ |
| F-03 | Navigation 3D | Must | ✅ |
| F-04 | Sélecteur d'étage | Must | ✅ |
| F-05 | Vue éclatée | Could | ✅ |
| F-06 | Zones nommées avec effectif | Must | ✅ |
| F-07 | Sélecteur de vue et calques | Must | ✅ |
| F-08 | Info-bulle au survol | Must | ✅ |
| F-09 | Fiche détail | Must | ✅ |
| F-10 | Chargement JSON + schéma commun | Must | ✅ |
| F-11 | Recherche | Should | ✅ |
| F-12 | URL partageable | Should | ✅ |
| F-13 | Équipements Domotique | Must | ✅ données d'exemple |
| F-14 | Liaisons par protocole | Must | ✅ |
| F-15 | Compteurs et chemin Niagara | Should | ✅ chemin de la donnée suivi en 3D jusqu'au serveur |
| F-16 | Réseaux et firewall | Must | ✅ |
| F-17 | Bornes Wi-Fi et couverture | Should | ✅ |
| F-18 | Baies, gaines, chemins de câbles | Should | ✅ |
| F-19 | Points d'entrée | Must | ✅ |
| F-20 | Score de surface d'attaque | Should | ✅ score indicatif et détail du calcul (formule à valider avec Cyber) |
| F-21 | Scénario d'intrusion animé | Could | ✅ |
| F-22 | Nœuds IA et fiche modèle | Must | ✅ |
| F-23 | Bascule Edge / central | Must | ✅ |
| F-24 | Cycle de vie de la donnée | Should | ✅ frise dans la fiche de chaque équipement |
| F-25 | Alerte zones < N personnes | Must | ✅ |
| F-26 | Simulation d'une journée | Could | ✅ |
| F-27 | Tout collecter / Minimum vital + indicateurs | Must | ✅ |
| F-28 | Vue Occupant | Should | ✅ |
| F-29 | Badges de preuve | Must | ✅ |
| F-30 | Matrice de risques liée | Should | ✅ vue Risques avec matrice impact × probabilité |
| F-31 | Mode présentation | Must | ✅ |
| F-32 | Glisser-déposer un modèle | Could | ✅ |
| F-33 | Personnages animés (travail, réunion, café, accueil, déplacements) | Could | ✅ liés à la simulation d'une journée |
| F-34 | Ascenseurs (cages vitrées, cabines animées) | Could | ✅ données dans `batiment.json` › `ascenseurs` |
| F-35 | Open space en îlots, écrans variés, cafétéria en quinconce | Could | ✅ |
| F-36 | Fiche personne (agenda, préférences, confort, ce que le bâtiment sait) | Could | ✅ |
| F-37 | Comparaison côte à côte Tout collecter / Minimum vital | Should | ✅ bouton « Comparer » : deux vues 3D, caméra synchronisée, chiffres par mode, capture assemblée |
| F-38 | Déplacements d'étage des occupants (café, imprimante) | Could | ✅ par l'ascenseur, porte ouverte ; la fiche indique où se trouve la personne |
| F-39 | Visite guidée de toute l'application | Should | ✅ bouton « Visite guidée » : 26 étapes, lecture automatique, halo sur l'interface, état restauré à la sortie |
| F-40 | Partage de configuration par lien | Could | ✅ Options › Configuration › « Copier le lien » ; la personne qui l'ouvre accepte ou ignore |
| F-41 | Tests automatiques | Should | ✅ tests unitaires (CI), test de fumée navigateur (CI), captures de référence (local) — voir `docs/TESTS.md` |
