-- ============================================================
-- TRADEFORGE — Schéma Supabase v3.0 (Version Finale)
-- Copiez ce script dans l'éditeur SQL de Supabase
-- Idempotent et sécurisé
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Mise à jour automatique du champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Création automatique du profil utilisateur
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 1. PROFILES — Profil utilisateur
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE,
  avatar_url  TEXT,
  timezone    TEXT DEFAULT 'UTC',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own profile" ON profiles;
CREATE POLICY "Users see own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ============================================================
-- 2. TRADES — Journal des positions
-- ============================================================
CREATE TABLE IF NOT EXISTS trades (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Infos de base
  date             DATE NOT NULL,
  market           TEXT NOT NULL,
  type             TEXT CHECK (type IN ('buy', 'sell')) NOT NULL,
  result           TEXT CHECK (result IN ('tp', 'sl', 'be', 'missed')),
  rr_planned       NUMERIC(5,2),
  rr_won           NUMERIC(5,2),
  
  -- Contexte marché
  trend            TEXT CHECK (trend IN ('bullish', 'bearish', 'neutre')),
  day              TEXT CHECK (day IN ('Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche')),
  session          TEXT CHECK (session IN ('London Session', 'New York Session', 'London Close Reversal', 'AM Session', 'PM Session', 'Hors session')),
  style            TEXT CHECK (style IN ('Day Trading', 'Scalping', 'Swing Trading')),
  market_structure TEXT CHECK (market_structure IN ('Consolidation', 'Expansion', 'Retracement', 'Reversal')),
  
  -- Psychologie
  emotion          TEXT,
  respect_plan     BOOLEAN DEFAULT TRUE,
  discipline_score INTEGER CHECK (discipline_score BETWEEN 1 AND 10),
  
  -- Médias & notes
  notes            TEXT,
  images           JSONB DEFAULT '[]'::JSONB,
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own trades" ON trades;
CREATE POLICY "Users see own trades" ON trades
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(date);
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market);
CREATE INDEX IF NOT EXISTS idx_trades_result ON trades(result);

-- ============================================================
-- 3. HINDSIGHT — Analyse post-trade
-- ============================================================
CREATE TABLE IF NOT EXISTS hindsight (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade_id    UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  main_error  TEXT NOT NULL,
  lesson      TEXT NOT NULL,
  rule        TEXT,
  notes       TEXT,
  tags        TEXT[] DEFAULT '{}',
  images      JSONB DEFAULT '[]'::JSONB,
  
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hindsight ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own hindsight" ON hindsight;
CREATE POLICY "Users see own hindsight" ON hindsight
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_hindsight_updated_at ON hindsight;
CREATE TRIGGER update_hindsight_updated_at
  BEFORE UPDATE ON hindsight
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_hindsight_user_id ON hindsight(user_id);
CREATE INDEX IF NOT EXISTS idx_hindsight_trade_id ON hindsight(trade_id);

-- ============================================================
-- 4. HINDSIGHTS_STANDALONE — Analyses indépendantes
-- ============================================================
CREATE TABLE IF NOT EXISTS hindsights_standalone (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  timeframes  TEXT[] DEFAULT '{}',
  markets     TEXT[] DEFAULT '{}',
  notes       TEXT,
  images      JSONB DEFAULT '[]'::JSONB,
  
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hindsights_standalone ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own hindsights_standalone" ON hindsights_standalone;
CREATE POLICY "Users see own hindsights_standalone" ON hindsights_standalone
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_hindsights_standalone_updated_at ON hindsights_standalone;
CREATE TRIGGER update_hindsights_standalone_updated_at
  BEFORE UPDATE ON hindsights_standalone
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_hindsights_standalone_user_id ON hindsights_standalone(user_id);

-- ============================================================
-- 5. RULES — Règles de trading
-- ============================================================
CREATE TABLE IF NOT EXISTS rules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  text        TEXT NOT NULL,
  category    TEXT DEFAULT 'other',
  active      BOOLEAN DEFAULT TRUE,
  
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own rules" ON rules;
CREATE POLICY "Users see own rules" ON rules
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);

-- ============================================================
-- 6. MONTHLY_GOALS — Objectifs mensuels
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_goals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  year             INTEGER NOT NULL,
  month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  
  goal_trades      INTEGER,
  goal_winrate     INTEGER CHECK (goal_winrate BETWEEN 0 AND 100),
  goal_profit      NUMERIC(6,2),
  goal_discipline  INTEGER CHECK (goal_discipline BETWEEN 1 AND 10),
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (user_id, year, month)
);

ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own goals" ON monthly_goals;
CREATE POLICY "Users see own goals" ON monthly_goals
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_monthly_goals_updated_at ON monthly_goals;
CREATE TRIGGER update_monthly_goals_updated_at
  BEFORE UPDATE ON monthly_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_monthly_goals_user ON monthly_goals(user_id, year, month);

-- ============================================================
-- 7. JOURNAL_ENTRIES — Journal quotidien
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  date             DATE NOT NULL,
  mood             INTEGER CHECK (mood BETWEEN 1 AND 5),
  content          TEXT,
  market_bias      TEXT CHECK (market_bias IN ('bullish', 'bearish', 'neutre')),
  sessions_planned TEXT[],
  
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE (user_id, date)
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own journal" ON journal_entries;
CREATE POLICY "Users see own journal" ON journal_entries
  FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_journal_updated_at ON journal_entries;
CREATE TRIGGER update_journal_updated_at
  BEFORE UPDATE ON journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, date);

-- ============================================================
-- 8. WEEKLY_FORECASTS — Prévisions hebdomadaires
-- ============================================================
CREATE TABLE IF NOT EXISTS weekly_forecasts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start    DATE NOT NULL,
  bias_forecast TEXT CHECK (bias_forecast IN ('Bullish', 'Bearish', 'Neutre', 'Indécis')),
  bias_real     TEXT CHECK (bias_real IN ('Bullish', 'Bearish', 'Neutre', 'Indécis')),
  analyses      JSONB DEFAULT '[]'::JSONB,
  news_images   JSONB DEFAULT '[]'::JSONB,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE weekly_forecasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own forecasts" ON weekly_forecasts;
CREATE POLICY "Users manage own forecasts" ON weekly_forecasts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_weekly_forecasts_updated_at ON weekly_forecasts;
CREATE TRIGGER trg_weekly_forecasts_updated_at
  BEFORE UPDATE ON weekly_forecasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 9. BACKTEST_CYCLES — Cycles de backtest
-- ============================================================
CREATE TABLE IF NOT EXISTS backtest_cycles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_hours INTEGER NOT NULL DEFAULT 100,
  started_at DATE NOT NULL,
  ended_at   DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backtest_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user own cycles" ON backtest_cycles;
CREATE POLICY "user own cycles" ON backtest_cycles
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 10. BACKTEST_SESSIONS — Sessions de backtest
-- ============================================================
CREATE TABLE IF NOT EXISTS backtest_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cycle_id   UUID REFERENCES backtest_cycles(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  minutes    INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE backtest_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user own sessions" ON backtest_sessions;
CREATE POLICY "user own sessions" ON backtest_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_backtest_sessions_user_id ON backtest_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_backtest_sessions_cycle_id ON backtest_sessions(cycle_id);

-- ============================================================
-- 11. PUSH_SUBSCRIPTIONS — Notifications PWA
-- ============================================================
DROP TABLE IF EXISTS push_subscriptions CASCADE;

CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   TEXT UNIQUE NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own subscriptions" ON push_subscriptions;
CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 12. STORAGE POLICIES — Bucket trade-images
-- ============================================================
DO $$ 
BEGIN
  -- Suppression des politiques existantes
  DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;
  DROP POLICY IF EXISTS "Public read" ON storage.objects;
  
  -- Création des nouvelles politiques
  CREATE POLICY "Authenticated users can upload" ON storage.objects
    FOR INSERT WITH CHECK (
      auth.role() = 'authenticated'
      AND bucket_id = 'trade-images'
    );
  
  CREATE POLICY "Authenticated users can update" ON storage.objects
    FOR UPDATE USING (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      AND bucket_id = 'trade-images'
    );
  
  CREATE POLICY "Authenticated users can delete" ON storage.objects
    FOR DELETE USING (
      auth.role() = 'authenticated'
      AND bucket_id = 'trade-images'
    );
  
  CREATE POLICY "Public read" ON storage.objects
    FOR SELECT USING (bucket_id = 'trade-images');
END $$;

-- ============================================================
-- MAINTENANCE: Mise à jour des données existantes
-- ============================================================

-- Mise à jour des jours de la semaine pour les trades existants
DO $$
BEGIN
  UPDATE trades
  SET day = CASE EXTRACT(DOW FROM date)
    WHEN 0 THEN 'Dimanche'
    WHEN 1 THEN 'Lundi'
    WHEN 2 THEN 'Mardi'
    WHEN 3 THEN 'Mercredi'
    WHEN 4 THEN 'Jeudi'
    WHEN 5 THEN 'Vendredi'
    WHEN 6 THEN 'Samedi'
  END
  WHERE day IS NULL;
END $$;

-- ============================================================
-- VÉRIFICATION FINALE
-- ============================================================
SELECT 
  table_name,
  COUNT(*) AS colonnes
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles', 'trades', 'hindsight', 'hindsights_standalone',
    'rules', 'monthly_goals', 'journal_entries', 'weekly_forecasts',
    'backtest_cycles', 'backtest_sessions', 'push_subscriptions'
  )
GROUP BY table_name
ORDER BY table_name;