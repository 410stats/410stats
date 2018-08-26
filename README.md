# 410stats

![alt tag](https://i.imgur.com/msNAS1G.png)

410stats est un script Node.js permettant de détecter les topics supprimés sur le forum 18-25 d'un célèbre de site de jeux vidéo

## Avant de commencer

### Pré-requis

Une base MySQL est necessaire pour stocker les données du script.
Un fichier *410stats.sql* est présent à la racine du repository, contenant les tables necessaires au script.

### Réglages

Un fichier de configuration est présent à l'emplacement *config/config.js*
Avant de lancer le script, **il faut y entrer l'URL du site cible et les réglages de la base MySQL**.

### Installation

```
npm install
```

### Lancement

Pour lancer le script en mode production", il faut modifier la variable NODE_ENV pour qu'elle soit égale à "production" avant de lancer le script

#### Exemple avec Powershell

```
$env:NODE_ENV="production"
node 410stats.js
```


## Librairies utilisées

- osmosis (Pour parser les pages HTML)
- axios (pour les requètes HTTP)
- moment (Pour parser les données de temps)
