# Tests automatiques

Trois niveaux, du plus rapide au plus lourd.

## 1. Tests unitaires — `npm test` (CI, bloquant)

Vitest, environnement jsdom, environ 8 s. Les fichiers sont dans `tests/`.

| Fichier | Ce qui est vérifié |
|---|---|
| `donnees.test.ts` | schéma et identifiants des `data/*.json`, zones dans l'emprise, scènes et étapes de la visite sur des vues existantes |
| `simulation.test.ts` | taux d'occupation entre 0 et 1, capacité jamais dépassée, total de personnes respecté, règle d'anonymat |
| `ascenseur.test.ts` | cabine continue, portes ouvertes seulement à l'arrêt, embarquement toujours porte ouverte |
| `deplacements.test.ts` | trajets entre étages continus, retour exact au siège, embarquement porte ouverte, rien hors du bâtiment |
| `reglages.test.ts` | bornes, valeurs invalides ramenées au défaut, 20 personnes par défaut, import / export |
| `lienConfig.test.ts` | lien de configuration : aller-retour, valeurs hostiles, pollution de prototype, taille maximale |
| `partage.test.ts` | lien de partage (hash) : aller-retour, valeurs absurdes ignorées, configuration reçue jamais appliquée sans accord |
| `parcours.test.ts` | chaque capteur mène à un serveur, scénarios d'intrusion cohérents |
| `comportement.test.ts` | aucune pose ne lève un bras tendu (régression du « salut ») |

Quand un test échoue après une modification, c'est en général que la modification casse une règle qu'on avait fixée : lire le message avant de changer le test.

## 2. Test de fumée dans un navigateur — `npm run test:e2e` (CI, non bloquant pour le déploiement)

Ouvre l'application construite dans Chromium sans carte graphique : les sept vues dessinent une scène non vide sans erreur JavaScript, la comparaison, le mode Minimum vital, les Options, le lien de configuration, la fiche d'une personne et la visite guidée répondent.

```
npm run build
npm run test:e2e                              # Chromium de Playwright : npx playwright-core install chromium
CHROME_PATH=/usr/bin/google-chrome npm run test:e2e   # ou un Chrome déjà installé
```

Compter environ 100 s (le rendu logiciel est lent).

## 3. Captures de référence — `npm run test:visuel` (local)

Compare chaque vue à une image de `tests/references/` (animations coupées, 20 personnes, scène identique à chaque prise) et signale la part de pixels qui diffère. Les images dépendent du moteur de rendu : elles ont été produites avec Chrome et le rendu logiciel SwiftShader. Sur une autre machine, régénérer d'abord :

```
npm run build
npm run test:visuel -- --maj      # enregistre les références
npm run test:visuel               # compare
```

En cas d'écart, l'image des différences est écrite dans `tests/references/<vue>.ecart.png` (et l’image obtenue dans `<vue>.actuel.png`). Ce niveau n'est pas lancé en CI : un changement de version du navigateur suffirait à le faire échouer sans qu'aucune modification du code en soit la cause.
