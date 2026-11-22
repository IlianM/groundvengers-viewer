# Personnalisation de l'appli

Bouton **Options ▾** (barre verte) : tiroir à six onglets. Tout est enregistré dans le navigateur (`localStorage`, clé `gv-options-v1`) et s'applique immédiatement. Chaque réglage modifié affiche un ↺ pour revenir à sa valeur par défaut ; chaque onglet a son « Réinitialiser ».

| Onglet | Réglages |
|---|---|
| Interface | mode sombre, couleur d'accent, taille du texte, panneaux gauche/droit/bandeau (affichage + largeur), recherche, boutons caméra, mention « fictif », aide clavier, noms des zones/niveaux, infobulles, taille des étiquettes |
| Caméra | champ de vision, recul max, rotation auto (+ vitesse), sensibilité rotation/zoom/déplacement, vitesse des flèches, animations, vitesse des déplacements |
| Rendu | qualité (économique/normale/haute), brouillard (+ densité), couleur du ciel, rectangles du bâtiment, taille des équipements, épaisseur des liens, opacité zones/meubles, anneaux, personnages (+ vitesse), **nombre de personnes** (20 par défaut ; curseur + bouton Appliquer, ou « auto » selon la simulation), ascenseurs animés |
| Décor | écart des niveaux et des pièces (vue éclatée), herbe/arbres/bâtiments lointains/meubles, quantité d'arbres, nombre d'immeubles, couleur de l'herbe, disposition aléatoire |
| Démarrage | vue de départ, Minimum vital au démarrage, seuil d'anonymat de départ, durée d'étape des scénarios, vitesse de la simulation d'une journée |
| Configuration | export / import, réinitialisation complète, chargement d'un .glb |

## Export / import

Format : JSON `{ "format": "groundvengers-config", "version": 1, "theme", "deco", "reglages": {…} }`.
- Export : téléchargement (`groundvengers-config.json`) ou copie.
- Import : fichier ou texte collé. Une valeur hors limites est ramenée à la plage permise, une valeur invalide retombe sur le défaut, une clé inconnue est ignorée et signalée. Un fichier d'un autre format est refusé.
- La config ne contient **aucune donnée du bâtiment** ni modèle 3D.

## Ajouter un réglage

1. Déclarer le champ (bornes, défaut) dans `src/reglages.ts`.
2. Le lire dans la scène/l'UI via `useEtat((s) => s.reglages.xxx)`.
3. Ajouter un contrôle dans l'onglet voulu de `src/ui/Options.tsx` (`Interrupteur`, `Curseur`, `Choix`, `Couleur`) et sa clé dans la liste de réinitialisation de l'onglet.
