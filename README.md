# Nacre — Dental Practice OS

Plateforme SaaS de gestion pour cabinets et cliniques dentaires, construite avec **React + Node.js/Express + MySQL**. Elle couvre le CRM patient, l'agenda, le dossier dentaire, l'odontogramme, les plans de traitement, les devis, la facturation, les paiements, le stock, les fournisseurs, le laboratoire, la communication, les rappels automatiques, les suivis, les avis, l'orthodontie, l'analytics, le portail patient, la réservation en ligne et un assistant IA administratif.

```
client/     React 18 (Vite) · React Router · TanStack Query
server/     Node 20 · Express 4 · Sequelize 6 · MySQL / MariaDB
prototype/  Maquette statique d'origine (référence visuelle)
```

## Démarrage rapide

Prérequis : Node 20+, et MySQL 8 ou MariaDB 10.4+ démarré (XAMPP convient).

1. Configurer la base dans `server/.env`. Partez de `server/.env.example` : hôte, utilisateur, mot de passe, nom de la base et `JWT_SECRET`.
2. Installer les dépendances, créer la base et charger les données de démonstration :
   ```bash
   npm run setup
   ```
3. Lancer l'API et le client en mode développement :
   ```bash
   npm run dev
   ```
4. Ouvrir les adresses :

| Adresse | Rôle |
|---|---|
| http://localhost:5600 | Site vitrine |
| http://localhost:5600/login | Espace cabinet |
| http://localhost:5600/rdv | Prise de rendez-vous en ligne |
| http://localhost:5600/portail | Portail patient |
| http://localhost:4600/api/health | État de l'API |

Les ports 5600 (client) et 4600 (API) se changent dans `client/vite.config.js` et `server/.env`.

### Comptes de démonstration

Le mot de passe est **`Nacre2026!`** pour tous les comptes.

| Email | Rôle |
|---|---|
| s.bennani@atlas-dentaire.ma | Dentiste + administratrice (Fès) |
| direction@atlas-dentaire.ma | Administrateur, vue sur les 3 cabinets |
| y.alaoui@atlas-dentaire.ma | Dentiste |
| accueil.fes@atlas-dentaire.ma | Secrétaire : pas d'accès clinique |
| h.ziani@atlas-dentaire.ma | Assistante |
| compta@atlas-dentaire.ma | Comptable |
| s.kabbaj@atlas-dentaire.ma | Gestionnaire |
| accueil.meknes@atlas-dentaire.ma | Secrétaire, limitée au cabinet de Meknès |

**Portail patient.** Saisissez le numéro d'un patient, par exemple celui d'Ahmed Benali (bouton de démo sur l'écran de connexion). En développement, le code SMS est pré-rempli et affiché dans la console de l'API.

### Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Lance l'API (nodemon) et le client (Vite) |
| `npm run build` puis `npm start` | Mode production : Express sert le client compilé sur le port 4600 |
| `cd server && npm run db:reset` | ⚠ Recrée toutes les tables et recharge les données de démonstration |
| `cd server && node scripts/smoke.js` | Test d'intégration de bout en bout (32 vérifications, API démarrée requise) |

## Architecture backend

- **Base de données.** 38 tables Sequelize (`server/src/models/index.js`) : patients, rendez-vous, consultations, odontogrammes et leur historique, plans et actes, devis, factures, paiements, produits, commandes, laboratoires, messages, règles de rappel, suivis, avis, orthodontie, documents, audit, sessions, etc. Les colonnes JSON sont stockées en texte pour rester compatibles avec MySQL et MariaDB.
- **Authentification.** JWT dans un cookie `httpOnly` / `SameSite=Lax`, adossé à une table `sessions`. Cela permet l'expiration après inactivité (paramétrable) et la révocation des sessions depuis Paramètres → Sécurité. La 2FA TOTP est compatible Google Authenticator, avec QR code dans « Mon compte », et peut être rendue obligatoire. Mots de passe hachés avec bcrypt, limitation de débit sur la connexion.
- **RBAC.** La table `role_permissions` est éditable dans Personnel → Rôles & permissions. Chaque route vérifie ses permissions **côté serveur** (`requirePerm`). Par exemple, la secrétaire reçoit la fiche patient sans antécédents ni traitements, et un accès aux consultations lui renvoie une erreur 403.
- **Multi-cabinets.** Chaque requête est filtrée par les établissements autorisés de l'utilisateur, avec l'en-tête `X-Clinic` pour la vue par site ou consolidée. L'accès à un patient d'un autre cabinet renvoie 404.
- **Audit.** Consultations de dossier, modifications cliniques, paiements, exports, connexions et actions du portail sont inscrits dans `audit_logs`.
- **Rappels automatiques.** Un job `node-cron` s'exécute toutes les 5 minutes (`services/reminders.js`) : rappel 24h avant, 3h avant, rappel renforcé pour les patients à risque de no-show, message après le rendez-vous. Le canal est choisi selon le consentement du patient. La table `reminder_logs` garantit qu'un même rappel n'est jamais envoyé deux fois.
- **Messagerie.** `services/core.js → sendMessage` enregistre chaque message et l'écrit dans la console en développement. C'est l'unique point où brancher un fournisseur SMS, WhatsApp Business ou email.
- **Fichiers.** Upload via multer dans `server/uploads/`, avec noms aléatoires et types limités à JPG, PNG, WEBP et PDF (15 Mo max). Les fichiers ne sont servis qu'après contrôle des permissions.
- **Portail patient.** Connexion par code SMS à 6 chiffres, haché, valable 10 minutes, 5 essais maximum. La réponse est identique que le numéro existe ou non, pour ne pas révéler les patients inscrits. Le patient n'accède qu'à ses propres données.
- **Réservation publique.** Seuls les créneaux réellement libres sont proposés. Un créneau pris entre-temps est refusé (409). Un champ piège anti-robots et une limitation de débit protègent le formulaire.

### Assistant IA

L'assistant se limite aux tâches administratives : synthèses, notes structurées, comptes rendus, suivis, organisation de l'agenda, rappels, modèles de messages. Toute demande de diagnostic ou de prescription est refusée.

- **Sans clé API :** génération locale déterministe à partir des données du cabinet.
- **Avec `ANTHROPIC_API_KEY` dans `server/.env` :** la rédaction passe par Claude (`claude-opus-5`, SDK officiel `@anthropic-ai/sdk`) côté serveur uniquement. Le contexte est minimisé : ni téléphone, ni email, ni adresse. Le repli serveur sur un autre modèle en cas de refus (`fallbacks: "default"`) est activé. En cas d'erreur, l'assistant revient automatiquement au mode local.
- Les actions proposées (envoi de rappels, création de tâches…) demandent toujours une confirmation humaine.

## Mise en production — points à compléter

- Créer un utilisateur MySQL dédié avec des droits limités à la base, et ne pas utiliser `root`. Définir un `JWT_SECRET` long et aléatoire, `NODE_ENV=production`, et HTTPS (le cookie passe alors en `secure`).
- Brancher les passerelles réelles : SMS / WhatsApp Business / email dans `sendMessage`, et paiement en ligne (CMI, Stripe…) dans `POST /api/portal/invoices/:id/pay`, avec validation par webhook.
- Mettre en place des sauvegardes planifiées : `mysqldump --single-transaction` chiffré vers un stockage hors site, plus la copie de `server/uploads/`.
- Prévoir le chiffrement au repos (disque ou tablespace MySQL) et l'hébergement des données de santé conformément au pays de déploiement (loi 09-08 et CNDP au Maroc, RGPD en Europe).
- L'impression PDF passe par le navigateur (« Enregistrer au format PDF »). Pour des PDF générés côté serveur, ajouter un moteur comme Puppeteer.
