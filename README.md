# Presse-papiers

L'historique de tout ce que tu copies dans Windows, rangé dans NeoDex : cherche dedans, épingle ce que tu réutilises souvent et recopie n'importe quel élément d'un clic. **Ctrl+Alt+H** l'ouvre de n'importe où.

*English version: [README.en.md](README.en.md)*

## Comment ça marche

Le plugin lit le presse-papiers de Windows chaque seconde, même quand NeoDex est en arrière-plan. Chaque nouveau texte copié, dans n'importe quelle application, s'ajoute en haut de l'historique avec l'heure de la copie (« à l'instant », « il y a 5 min »…).

- Recopier un texte déjà présent le remonte en tête au lieu de créer un doublon.
- Ce qui était déjà copié au lancement de NeoDex n'est pas compté.
- Seul le texte est gardé (jusqu'à 20 000 caractères par élément), pas les images ni les fichiers.

## Utiliser l'historique

- **Clic** sur un élément : il est recopié dans le presse-papiers, prêt à coller.
- **Épingler** : l'élément passe dans la partie **Épinglés**, en haut, et n'est jamais effacé tout seul. **Désépingler** le remet dans les **Récents**.
- **Chercher** : filtre l'historique pendant que tu tapes.
- **Pause** : rien de ce que tu copies n'est enregistré tant que la pause est active.
- **Tout effacer** : vide l'historique, sauf les épinglés (après confirmation).

## Confidentialité

- Les 200 derniers éléments sont gardés ; au-delà, les plus anciens non épinglés partent.
- Ce qu'un gestionnaire de mots de passe marque « à ne pas garder » (le signal standard de Windows pour les mots de passe copiés) n'est jamais enregistré.
- Tout reste sur ton ordinateur.

## Autorisation

Le plugin a besoin de l'autorisation **volet système** pour lire le presse-papiers en arrière-plan ; sans elle, il le signale et indique où l'accorder (Autorisations).

## Données et synchronisation

Rien n'est synchronisé : l'historique est propre à chaque PC et reste dans le dossier du plugin.

## Installer

Dans NeoDex : **NeoStore → À découvrir → Presse-papiers → Installer**.

Développer un plugin : voir le [SDK NeoDex](https://github.com/NDesumeur/neodex-sdk).
