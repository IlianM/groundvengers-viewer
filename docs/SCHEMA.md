# Schéma de données
> Mise à jour IFC : `zone.type` accepte aussi `sanitaire`, `stockage`, `parking` ; `niveau.emprise` (optionnel, `[x, z, largeur, profondeur]`) donne l'empreinte propre d'un niveau (les sous-sols sont plus petits que les étages).

La référence est `src/schema/index.ts` (Zod). Résumé :

| Objet | Fichier | Champs clés |
| --- | --- | --- |
| Niveau | batiment.json | `id`, `altitude`, `hauteur` |
| Zone | batiment.json | `id`, `niveau`, `type`, `effectif_max`, `detection_presence`, `rect [x, z, largeur, profondeur]` |
| Ascenseur | batiment.json | `id`, `nom`, `position [x, z]`, `taille [largeur, profondeur]`, `niveaux` desservis |
| Équipement | domotique / cyber / ia.json | `id`, `equipe`, `categorie`, `type`, `niveau`, `zone`, `position`, `protocole`, `reseau`, `config`, `donnee`, `point_entree`, `risques`, `preuves` |
| Lien | domotique / cyber / ia.json | `id`, `type`, `protocole`, `de`, `vers`, `autorise_par_firewall`, `minimum_vital` |
| Gaine | cyber.json (`gaines`) | `id`, `type (horizontale / montante)`, `reseau (GTB / bureautique / fibre / mixte)`, `niveau` ou `de` + `a`, `chemin [[x, z], …]`, `hauteur`, `contient` (ids de liens) |
| Scénario d'intrusion | cyber.json (`scenarios`) | `id`, `nom`, `resume`, `etapes [{ de, vers, texte, bloque }]` (`de: "externe"` = l'attaquant), `conclusion`, `risques` |
| Nœud IA | ia.json | `id`, `heberge_sur`, `architecture (edge / central)`, `modele`, `entrees`, `sorties`, `conservation`, `mode_degrade` |
| Preuve | preuves.json | `id`, `statut (sourcee / observee / simulee)`, `titre`, `document`, `lien` |
| Risque | preuves.json | `id`, `nom`, `impact`, `probabilite`, `preventif`, `correctif` |

## Le champ `donnee` (cœur du minimum vital)

- `nature` : `technique`, `environnementale`, `occupation_agregee`, `identifiante`
- `identifiante` : la donnée permet-elle de savoir qui est là ?
- `conservation` : texte libre (« agrégé 72 h »)
- `minimum_vital` : `false` = l'équipement disparaît en mode « Minimum vital »
- `periode_s` : période de mesure, sert à compter les mesures par jour

## Règle d'anonymat (F-25)

Une zone est signalée si `detection_presence` est vrai et `effectif_max` est sous le seuil N réglable (5 par défaut). En mode minimum vital, seulement si un capteur de présence y reste actif.
