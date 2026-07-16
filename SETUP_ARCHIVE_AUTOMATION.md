# 📦 Automatisation Archive de Saison

## Architecture

La solution comprend une **Cloud Function HTTP** déclenchée par **Cloud Scheduler** de Google Cloud.

### Fichiers créés:

- `functions/index.js` - La Cloud Function
- `functions/package.json` - Dépendances Node.js

---

## Installation & Déploiement

### 1. **Prérequis**

```bash
# Installer Firebase CLI globalement
npm install -g firebase-tools

# Se connecter à Google Cloud
firebase login
```

### 2. **Déployer la Cloud Function**

```bash
cd functions/
npm install
cd ..

# Déployer la fonction
firebase deploy --only functions:archiveSeasonAtMonthEnd
```

L'URL de la fonction sera affichée (format):

```
https://[REGION]-babyfoot-a78f5.cloudfunctions.net/archiveSeasonAtMonthEnd
```

---

## Configuration Cloud Scheduler

### Via Google Cloud Console:

1. **Ouvrir Cloud Scheduler**
   - https://console.cloud.google.com/cloudscheduler
   - Sélectionner le projet `babyfoot-a78f5`
   - Région: `europe-west1` (ou la région de vos Cloud Functions)

2. **Créer un nouveau Job**
   - Cliquer sur "CREATE JOB"
   - **Name**: `archive-season-monthly`
   - **Frequency**: `0 23 28-31 * *`
     - Explications:
       - `0 23` = 23h00 (UTC)
       - `28-31` = jours 28 à 31 du mois
       - La fonction vérifiera elle-même si c'est le dernier jour
   - **Timezone**: `UTC` (ou adapté à votre fuseau)
   - Cliquer **CONTINUE**

3. **Configuration du déclenchement**
   - **Execution type**: HTTP
   - **URL**: Coller l'URL de la Cloud Function
   - **HTTP method**: POST
   - **Auth header**: OIDC Token
   - **Service account email**: `[PROJECT-ID]@appspot.gserviceaccount.com`
   - Laisser le reste par défaut
   - Cliquer **CREATE**

### Via gcloud CLI:

```bash
gcloud scheduler jobs create http archive-season-monthly \
  --location=europe-west1 \
  --schedule="0 23 28-31 * *" \
  --uri="https://[REGION]-babyfoot-a78f5.cloudfunctions.net/archiveSeasonAtMonthEnd" \
  --http-method=POST \
  --oidc-service-account-email="[PROJECT-ID]@appspot.gserviceaccount.com" \
  --project=babyfoot-a78f5
```

---

## Fonctionnement

### Chaque dernier jour du mois à 23h00:

1. **Cloud Scheduler** déclenche un POST HTTP vers la Cloud Function
2. **Cloud Function** vérifie que c'est bien le dernier jour du mois
3. **Archivage**:
   - Récupère tous les joueurs
   - Construit le classement final
   - Crée un document dans la collection `archives`
4. **Reset**:
   - Supprime TOUS les matchs
   - Reset ELO à 1000 pour tous les joueurs
   - Remet à 0: wins, losses, lastDiff, history

---

## Logs & Monitoring

### Voir les exécutions:

```bash
# Via gcloud
gcloud scheduler jobs describe archive-season-monthly \
  --location=europe-west1 \
  --project=babyfoot-a78f5

# Via Cloud Console
https://console.cloud.google.com/cloudscheduler
```

### Voir les logs:

```bash
# Logs de la Cloud Function
gcloud functions logs read archiveSeasonAtMonthEnd \
  --limit=50 \
  --project=babyfoot-a78f5
```

Ou dans la Console:

- https://console.cloud.google.com/functions/details/[REGION]/archiveSeasonAtMonthEnd?project=babyfoot-a78f5

---

## Sécurité

- ✅ La Cloud Function ne se déclenche que via Cloud Scheduler (authentifié)
- ✅ Verification interne que c'est le dernier jour du mois
- ✅ Service Account restreint au projet Firebase

---

## Désactiver / Modifier

### Suspendre le job:

```bash
gcloud scheduler jobs pause archive-season-monthly \
  --location=europe-west1 \
  --project=babyfoot-a78f5
```

### Relancer le job:

```bash
gcloud scheduler jobs resume archive-season-monthly \
  --location=europe-west1 \
  --project=babyfoot-a78f5
```

### Modifier le planning:

```bash
gcloud scheduler jobs update http archive-season-monthly \
  --location=europe-west1 \
  --schedule="0 23 28-31 * *" \
  --project=babyfoot-a78f5
```

---

## Troubleshooting

### "Cloud Scheduler API not enabled"

```bash
gcloud services enable cloudscheduler.googleapis.com \
  --project=babyfoot-a78f5
```

### "Cloud Functions API not enabled"

```bash
gcloud services enable cloudfunctions.googleapis.com \
  --project=babyfoot-a78f5
```

### La fonction ne se déclenche pas

1. Vérifier que Cloud Scheduler est actif
2. Vérifier les logs Cloud Function
3. S'assurer que le Service Account a les permissions Firestore
4. Tester manuellement via Cloud Console → Cloud Functions → Test the function

---

## Points importants

⚠️ **Collections Firestore utilisées**:

- `players` - Collection des joueurs
- `matches` - Collection des matchs
- `archives` - Collection des archives

⚠️ **ELO par défaut**: `2000` (correspondant à `APP_CONFIG.DEFAULT_ELO`)
