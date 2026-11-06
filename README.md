# Duo 🎲

Défis du jour, roue, paris et voyage Séoul-Osaka, synchronisés à deux.
Une PWA statique : aucun build, à déployer telle quelle sur Vercel.

## Fichiers
- `index.html`, `app.js` : l'appli
- `firebase-config.js` : la configuration Firebase (à remplir)
- `firestore.rules` : les règles de sécurité de la base
- `manifest.webmanifest`, `sw.js`, `icons/` : installation sur l'écran d'accueil, hors connexion, logo des dés

## 1. Firebase (la synchro)
1. Va sur console.firebase.google.com, puis **Ajouter un projet**, nommé « duo ». Google Analytics n'est pas utile.
2. Menu **Firestore Database**, puis **Créer une base de données**, en mode production, avec la région **eur3 (Europe)**.
3. Onglet **Règles** : colle le contenu de `firestore.rules`, puis **Publier**.
4. Touche ⚙️, puis **Paramètres du projet**, puis **Vos applications**, puis l'icône **</>** (Web). Nomme l'app « Duo » et laisse Hosting décoché.
5. Copie le bloc `firebaseConfig` dans `firebase-config.js`.

## 2. GitHub et Vercel (la mise en ligne)
1. Mets ce dossier dans un dépôt GitHub (par exemple `duo`).
2. Sur vercel.com, va dans **Add New**, puis **Project**, importe le dépôt, puis **Deploy** (aucun réglage nécessaire).

## 3. Installer sur iPhone
Ouvre l'adresse Vercel dans **Safari**, touche **Partager**, puis **Sur l'écran d'accueil**.
Le nom Duo et le logo des dés se mettent automatiquement.

## 4. Se synchroniser à deux
1. Chacun installe d'abord Duo sur son écran d'accueil (étape 3).
2. Sur le premier téléphone : touche la date en haut, puis **Inviter**, et envoie le lien.
3. Sur le second : ouvre Duo **depuis l'icône**, touche la date en haut, colle le lien dans **Rejoindre**, puis valide.

Sur iPhone, l'appli installée ne partage pas ses données avec Safari : il faut donc rejoindre le duo depuis l'icône, pas depuis Safari.
Pas de compte à créer : c'est le code secret du lien qui vous relie.
