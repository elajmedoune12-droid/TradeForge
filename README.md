# 📊 TradeForge

Journal de trading avancé avec analyse psychologique, multi-timeframe et IA.

---

## 🚀 Installation rapide

```bash
# 1. Cloner / extraire le projet
cd tradeforge

# 2. Installer les dépendances
npm install

# 3. Configurer Supabase
cp .env.example .env
# Éditez .env avec vos clés Supabase

# 4. Lancer
npm run dev
```

---

## ⚙️ Configuration Supabase

### Étape 1 — Créer un projet
1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez l'**URL** et la clé **anon**

### Étape 2 — Configurer .env
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Étape 3 — Créer la base de données
1. Dans votre projet Supabase → **SQL Editor**
2. Copiez-collez le contenu de `supabase_schema.sql`
3. Cliquez **Run**

### Étape 4 — Créer le bucket Storage
1. Supabase → **Storage** → **New bucket**
2. Nom : `trade-images`
3. Cochez **Public bucket**
4. Dans Policies → ajoutez :
   - `INSERT` pour `authenticated`
   - `SELECT` pour `public`

---

## 📁 Structure du projet

```
src/
├── components/
│   └── Layout.jsx          # Navigation bottom bar + top bar
├── hooks/
│   ├── useAuth.jsx          # Context Auth (session Supabase)
│   └── useTrades.js         # Fetch et cache des trades
├── pages/
│   ├── Login.jsx            # Auth email/password
│   ├── Dashboard.jsx        # Stats + graphique + IA insights
│   ├── AddTrade.jsx         # Formulaire ajout trade
│   ├── TradesList.jsx       # Liste avec filtres
│   ├── TradeDetail.jsx      # Détail + images lightbox
│   ├── Hindsight.jsx        # Post-trade analysis
│   ├── Errors.jsx           # Analyse automatique erreurs
│   ├── Rules.jsx            # Gestion règles trading
│   ├── MonthlyAnalysis.jsx  # Analyse mensuelle + tendances
│   └── Settings.jsx         # Profil + déconnexion
├── services/
│   └── supabase.js          # Toutes les fonctions DB/Auth/Storage
└── utils/
    └── index.js             # calcWinRate, calcRR, stats, IA patterns
```

---

## 🧠 Fonctionnalités IA (locales)

L'IA est entièrement locale, pas d'API externe requise :

- **Détection de patterns** : pertes quand discipline basse, gains quand plan respecté, FOMO
- **Feedback automatique** : analyse win rate, RR moyen, score discipline
- **Conclusions mensuelles** : générées automatiquement à partir des données

---

## 📱 Mobile-first

L'app est optimisée pour iPhone :
- Navigation bottom bar
- Formulaires rapides < 1 minute
- Lightbox images plein écran avec swipe navigation
- Tap targets adaptés

---

## 🛠️ Stack

| Technologie | Usage |
|---|---|
| React 18 + Vite | UI framework |
| Supabase | Auth + PostgreSQL + Storage |
| Tailwind CSS | Styling |
| React Router v6 | Navigation |
| Recharts | Graphiques |
| date-fns | Dates |
| Lucide React | Icônes |

---

## 📦 Build production

```bash
npm run build
# Fichiers dans /dist — déployable sur Vercel, Netlify, etc.
```

---

## 🔑 Variables d'environnement

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL de votre projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé publique anonyme Supabase |
