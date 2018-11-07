# 410stats

![alt tag](https://i.imgur.com/msNAS1G.png)

410stats est un script Node.js permettant de détecter les topics supprimés sur le forum de la classe d'âge 18-25 ans d'un célèbre de site de jeux vidéo

### Features

- Support de proxy socks
- Anonymisation des requêtes (random user-agent, cookie ...)
- Gestion des restaurations de topic
- Collecte de statistiques sur le nombre de connectés
- Utilisation du load balancer du site cible pour partager les rèquetes sur différents serveurs

## Avant de commencer

### Pré-requis

Une base MySQL 5.7 est necessaire pour stocker les données du script.
Un fichier *410stats.sql* est présent à la racine du repository, contenant les tables necessaires au script.

### Réglages

Un fichier de configuration est présent à l'emplacement *config/config.js*
Avant de lancer le script, **il faut y entrer l'URL du site cible et les réglages de la base MySQL**.
Un fichier exemple *config/default.js* est accessible. Il contient des paramètres fictifs et des informations sur chaque paramètre pour vous aider à régler votre configuration.

### Installation

```
npm install
```

### Lancement

Pour lancer le script en mode production, il faut modifier la variable NODE_ENV pour qu'elle soit égale à "production" avant de lancer le script. Sinon le script utilisera les réglages "developpement"

#### Exemple avec Powershell

```
$env:NODE_ENV="production"
node 410stats.js
```


## Librairies utilisées

- cheerio (Pour parser les pages HTML)
- node-fetch (pour les requètes HTTP)
- socks-proxy-agent (pour la gestion des proxy socks)

## Notes

#### Proxy

Pour l'instant, il n'y a pas de gestion avancée des proxy. Si votre proxy est inaccessible ou banni par le site cible, il continuera quand même d'être utilisé, rendant le script moins efficace.

#### MySQL 8

410stats n'est pas compatible avec MySQL 8 pour l'instant.
