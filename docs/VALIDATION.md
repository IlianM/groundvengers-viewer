# Checklist de validation par équipe

Tout ce que montre l'appli est **fictif** tant que ces points ne sont pas validés. Pour chaque point : ✅ valide, ✏️ à corriger (dire quoi), ❌ à retirer. Les corrections se font dans `data/` (voir `CONTRIBUER.md`) ou en commentaire sur ce document.

## Équipe Cyber

Fichiers : `data/cyber.json`, `src/scene/visibles.ts` (score).

- [ ] **Gaines (9)** : tracés et hauteurs plausibles : `GAINE-R0-BUR`, `GAINE-R0-HALL`, `GAINE-R0-GTB`, `GAINE-R0-DORSALE`, `MONT-01` (montante R0 → R2), `GAINE-R1-BUR`, `GAINE-R1-BUR-B`, `GAINE-R2-FIBRE`, `GAINE-R2-BUR`. La séparation GTB / bureautique est-elle respectée ?
- [ ] **Scénarios d'intrusion (3)** : étapes, équipements touchés et point où la coupure arrête l'attaque : `SCN-WIFI` (rebond depuis une borne Wi-Fi), `SCN-CLOUD` (passerelle cloud du constructeur), `SCN-CAMERA` (caméra IP du hall). Manque-t-il un scénario réaliste ?
- [ ] **Équipements réseau (14)** : liste, protocoles, `point_entree`, règles de pare-feu (`autorise_par_firewall`) : `BOX-INTERNET`, `FW-01`, `SW-BUR-01`, `SW-GTB-01`, `BAIE-R0/R1/R2-01`, `AP-WIFI-*`, `CAM-R0-01`, `BADGE-R0-01`, `GW-CLOUD-01`.
- [ ] **Score de surface d'attaque** : poids actuels = point d'entrée ×3, flux vers Internet ×2, protocole ×1, donnée identifiante ×2 (`POIDS_SURFACE`). Formule à confirmer ou remplacer (valeur actuelle : 46 en Tout collecter, 26 en Minimum vital).
- [ ] **Risques (5)** : impact et probabilité, mesures préventives et correctives : `RSK-INTRUSION`, `RSK-CAPTEUR`, `RSK-IA`, `RSK-OBSOLESCENCE`, `RSK-IDENTIFICATION`.

## Équipe Domotique

Fichiers : `data/domotique.json`, `data/batiment.json`, `public/models/` (export 3D).

- [ ] **Équipements et bus (27)** : types, protocoles (LonWorks, M-Bus, Modbus, DALI), positions dans les pièces, périodes de mesure (elles fixent le « mesures par jour »).
- [ ] **Chemin de la donnée** : compteur → passerelle iSMA → serveur Niagara : les liens (`LNK-MBUS-R0`, `LNK-MODBUS-R0`, `LNK-ETH-GTB`) correspondent-ils à l'installation prévue ?
- [ ] **Durées de conservation** (texte du champ `conservation`) : mensuel 10 ans (OPERAT) pour les compteurs, 1 an pour le superviseur : à confirmer.
- [ ] **Gaines GTB** : aucune n'est décrite côté Domotique (`gaines` vide). Ajouter les chemins du bus terrain.
- [ ] **Bâtiment** : 3 niveaux, 16 zones, effectifs max, 2 ascenseurs (`ascenseurs` dans `batiment.json`) : conformes au bâtiment réel ?
- [ ] **Export 3D réel** : tester un vrai `.glb` (`docs/EXPORT-3D.md`) : objets nommés comme les identifiants (`CPT-ELEC-TGBT`…) et ouvrant leur fiche.
- [ ] **Confort** : consigne unique de 21 °C et modèle de température simulé (`src/simulation.ts`) : réalistes ? À remplacer par la vraie régulation.

## Équipe IA

Fichiers : `data/ia.json`.

- [ ] **Nœuds de calcul (4)** : `IA-EDGE-R0/R1/R2` et `IA-CENTRAL` : modèle, entrées, sorties, fréquence, mode dégradé.
- [ ] **Conservation** : brut et agrégé (durées, effacement) par nœud, et frise « Mesure → Calcul local → Agrégat → Effacé ».
- [ ] **Seuil d'anonymat** : valeur par défaut de 5 personnes (règle DPO) ; zones concernées en Tout collecter : Bureau RH. Seuil confirmé par le DPO ?
- [ ] **Simulation d'une journée et profils d'occupation** (`src/simulation.ts`) : crédibles ? À remplacer par des mesures réelles.
- [ ] **Préférences individuelles** (fiche personne) : le bloc « Ce que coûte le minimalisme » compare 21 °C fixe et consigne moyenne : méthode à valider avant tout chiffre présenté.

## Preuves à sourcer

Six preuves sont encore au statut « simulée » : `PRV-DPO-01`, `PRV-RSSI-01`, `PRV-Q-OCCUPANTS`, `PRV-Q-EXPLOITANTS`, `PRV-VERBATIM-MARC`, `PRV-VERBATIM-SOPHIE`. Fournir le document réel ou confirmer qu'elles restent simulées.

## Pour tous

- [ ] Remplacer les données fictives par les réelles, puis `npm run check-data` (doit afficher « Données valides »).
- [ ] Relire la mention « données fictives » : elle reste affichée tant que ce n'est pas fait.
