-- =========================================================
-- Personal Finance App - PostgreSQL Starter Schema
-- =========================================================
-- Notes:
-- 1) Money is stored in minor units (e.g. cents) using BIGINT
-- 2) Every business table includes user_id for Row Level Security
-- 3) RLS uses current_setting('app.current_user_id', true)
-- 4) Recommended: execute all app queries inside a transaction
--    after setting:
--    SELECT set_config('app.current_user_id', '<USER_ID>', true);
-- =========================================================

create extension if not exists pgcrypto;

create schema if not exists app;

set search_path to app, public;

-- =========================================================
-- ENUMS
-- =========================================================

create type user_status as enum (
  'active', 'invited', 'suspended'
);

create type session_status as enum (
  'active', 'revoked', 'expired'
);

create type sync_provider as enum (
  'manual', 'plaid', 'belvo', 'pluggy', 'open_finance_br', 'other'
);

create type connection_status as enum (
  'active', 'needs_reauth', 'error', 'disconnected'
);

create type account_kind as enum (
  'checking',
  'savings',
  'credit_card',
  'cash',
  'investment',
  'loan',
  'digital_wallet',
  'prepaid_card',
  'other'
);

create type account_ownership_type as enum (
  'personal',
  'joint',
  'business'
);

create type account_status as enum (
  'active',
  'archived',
  'closed'
);

create type category_kind as enum (
  'income',
  'expense',
  'transfer',
  'system'
);

create type transaction_type as enum (
  'income',
  'expense',
  'transfer',
  'adjustment',
  'bill_payment',
  'refund'
);

create type transaction_status as enum (
  'pending',
  'posted',
  'scheduled',
  'voided'
);

create type transaction_source as enum (
  'manual',
  'imported',
  'synced',
  'system_generated'
);

create type recurrence_frequency as enum (
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom'
);

create type recurring_rule_status as enum (
  'active',
  'paused',
  'ended',
  'cancelled'
);

create type budget_status as enum (
  'active',
  'archived'
);

create type budget_period as enum (
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom'
);

create type category_target_type as enum (
  'monthly',
  'by_date',
  'maintain_balance',
  'weekly',
  'custom'
);

create type category_target_status as enum (
  'on_track',
  'underfunded',
  'funded',
  'overfunded',
  'snoozed',
  'none'
);

create type budget_assignment_event_type as enum (
  'assign',
  'move',
  'auto_assign',
  'reset',
  'target_fund',
  'rollback'
);

create type goal_type as enum (
  'emergency_fund',
  'vacation',
  'vehicle',
  'home',
  'retirement',
  'education',
  'custom'
);

create type goal_status as enum (
  'active',
  'paused',
  'completed',
  'cancelled'
);

create type goal_contribution_source as enum (
  'manual',
  'automatic',
  'transaction_match'
);

create type asset_type as enum (
  'cash',
  'stock',
  'etf',
  'mutual_fund',
  'bond',
  'crypto',
  'real_estate',
  'vehicle',
  'private_equity',
  'retirement_account',
  'other'
);

create type liability_type as enum (
  'credit_card',
  'personal_loan',
  'mortgage',
  'vehicle_loan',
  'student_loan',
  'line_of_credit',
  'other'
);

create type snapshot_source as enum (
  'manual',
  'imported',
  'system'
);

-- =========================================================
-- HELPERS
-- =========================================================

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

-- =========================================================
-- USERS / AUTH
-- =========================================================

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  preferred_currency varchar(3) not null default 'CAD',
  locale text not null default 'en-CA',
  timezone text not null default 'America/Toronto',
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  status session_status not null default 'active',
  ip_address inet,
  user_agent text,
  expires_at timestamptz not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  start_of_month_day int not null default 1 check (start_of_month_day between 1 and 28),
  week_starts_on int not null default 1 check (week_starts_on between 0 and 6),
  date_format text,
  theme text,
  compact_numbers boolean not null default false,
  show_cents boolean not null default true,
  default_account_id uuid,
  default_income_category_id uuid,
  default_expense_category_id uuid,
  onboarding_completed boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- INSTITUTIONS / CONNECTIONS
-- =========================================================

create table if not exists institutions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider sync_provider not null default 'manual',
  provider_ref text,
  name text not null,
  logo_url text,
  country_code varchar(2),
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, provider, provider_ref)
);

create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  institution_id uuid references institutions(id) on delete set null,
  provider sync_provider not null,
  provider_connection_ref text,
  status connection_status not null default 'active',
  display_name text,
  last_successful_sync_at timestamptz,
  last_attempt_at timestamptz,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (provider, provider_connection_ref)
);

-- =========================================================
-- BUDGETS
-- =========================================================

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  currency varchar(3) not null default 'CAD',
  is_default boolean not null default false,
  status budget_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_budgets_user_default
  on budgets(user_id)
  where is_default = true and deleted_at is null;

create table if not exists category_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0,
  is_system boolean not null default false,
  is_active boolean not null default true,
  color text,
  icon text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (budget_id, name)
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  category_group_id uuid not null references category_groups(id) on delete cascade,
  parent_category_id uuid references categories(id) on delete set null,
  kind category_kind not null default 'expense',
  name text not null,
  slug text,
  description text,
  sort_order int not null default 0,
  is_system boolean not null default false,
  is_active boolean not null default true,
  color text,
  icon text,
  goal_hint_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (budget_id, category_group_id, name)
);

create table if not exists budget_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  month_key char(7) not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  month_start date not null,
  month_end date not null,
  ready_to_assign_minor bigint not null default 0,
  total_assigned_minor bigint not null default 0,
  total_activity_minor bigint not null default 0,
  total_available_minor bigint not null default 0,
  leftover_from_previous_minor bigint not null default 0,
  check (ready_to_assign_minor >= 0),
  check (total_assigned_minor >= 0),
  check (total_activity_minor >= 0),
  check (total_available_minor >= 0),
  check (leftover_from_previous_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_id, month_key)
);

create table if not exists category_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  budget_month_id uuid not null references budget_months(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  assigned_minor bigint not null default 0,
  activity_minor bigint not null default 0,
  available_minor bigint not null default 0,
  carryover_from_previous_minor bigint not null default 0,
  underfunded_minor bigint not null default 0,
  check (assigned_minor >= 0),
  check (activity_minor >= 0),
  check (available_minor >= 0),
  check (carryover_from_previous_minor >= 0),
  check (underfunded_minor >= 0),
  -- available and underfunded are a partition of carryover + assigned - activity.
  check (available_minor - underfunded_minor = carryover_from_previous_minor + assigned_minor - activity_minor),
  target_status category_target_status not null default 'none',
  is_snoozed boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_month_id, category_id)
);

create table if not exists category_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  target_type category_target_type not null,
  target_amount_minor bigint,
  monthly_amount_minor bigint,
  target_date date,
  repeat_interval int,
  due_day int check (due_day between 1 and 31),
  start_month_key char(7),
  end_month_key char(7),
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists budget_assignment_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  budget_id uuid not null references budgets(id) on delete cascade,
  budget_month_id uuid not null references budget_months(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  source_category_id uuid references categories(id) on delete set null,
  event_type budget_assignment_event_type not null,
  amount_minor bigint not null,
  notes text,
  created_by_user_id uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- =========================================================
-- ACCOUNTS
-- =========================================================

create table if not exists financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  institution_id uuid references institutions(id) on delete set null,
  connection_id uuid references connections(id) on delete set null,
  external_ref text,
  name text not null,
  display_name text,
  kind account_kind not null,
  ownership_type account_ownership_type not null default 'personal',
  status account_status not null default 'active',
  currency varchar(3) not null default 'CAD',
  opening_balance_minor bigint not null default 0,
  current_balance_minor bigint not null default 0,
  available_balance_minor bigint,
  credit_limit_minor bigint,
  minimum_payment_minor bigint,
  statement_closing_day int check (statement_closing_day between 1 and 31),
  statement_due_day int check (statement_due_day between 1 and 31),
  account_number_masked text,
  last_four varchar(4),
  color text,
  icon text,
  include_in_net_worth boolean not null default true,
  include_in_cash_flow boolean not null default true,
  is_manual boolean not null default true,
  is_visible boolean not null default true,
  is_on_budget boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (connection_id, external_ref)
);

-- =========================================================
-- TRANSACTION SUPPORT
-- =========================================================

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  normalized_name text,
  website text,
  logo_url text,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
);

create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, name)
);

create table if not exists credit_card_statements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  account_id uuid not null references financial_accounts(id) on delete restrict,
  reference_year int not null,
  reference_month int not null check (reference_month between 1 and 12),
  label text,
  period_start date not null,
  period_end date not null,
  closing_date date not null,
  due_date date not null,
  opening_balance_minor bigint not null default 0,
  purchases_total_minor bigint not null default 0,
  payments_total_minor bigint not null default 0,
  adjustments_total_minor bigint not null default 0,
  interest_total_minor bigint not null default 0,
  fees_total_minor bigint not null default 0,
  closing_balance_minor bigint not null default 0,
  minimum_due_minor bigint,
  is_closed boolean not null default false,
  is_paid boolean not null default false,
  paid_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (account_id, reference_year, reference_month)
);

create table if not exists recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  account_id uuid references financial_accounts(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  merchant_id uuid references merchants(id) on delete set null,
  name text not null,
  description_template text,
  type transaction_type not null,
  status recurring_rule_status not null default 'active',
  frequency recurrence_frequency not null,
  interval int not null default 1 check (interval > 0),
  amount_minor bigint not null,
  currency varchar(3) not null default 'CAD',
  starts_at timestamptz not null,
  ends_at timestamptz,
  next_run_at timestamptz,
  last_run_at timestamptz,
  day_of_month int check (day_of_month between 1 and 31),
  day_of_week int check (day_of_week between 0 and 6),
  month_of_year int check (month_of_year between 1 and 12),
  auto_create boolean not null default true,
  auto_post boolean not null default false,
  create_days_ahead int not null default 0,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  budget_id uuid references budgets(id) on delete set null,
  account_id uuid not null references financial_accounts(id) on delete restrict,
  category_id uuid references categories(id) on delete set null,
  merchant_id uuid references merchants(id) on delete set null,
  statement_id uuid references credit_card_statements(id) on delete set null,
  recurring_rule_id uuid references recurring_rules(id) on delete set null,
  parent_transaction_id uuid references transactions(id) on delete set null,
  group_key text,
  type transaction_type not null,
  status transaction_status not null default 'posted',
  source transaction_source not null default 'manual',
  description text not null,
  notes text,
  currency varchar(3) not null default 'CAD',
  amount_minor bigint not null,
  original_amount_minor bigint,
  exchange_rate numeric(18,8),
  transaction_date date not null,
  posted_at timestamptz,
  competency_date date,
  due_date date,
  installment_number int,
  installment_count int,
  is_credit_card_charge boolean not null default false,
  is_cleared boolean not null default true,
  is_hidden boolean not null default false,
  external_ref text,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_transactions_account_external_ref
  on transactions(account_id, external_ref)
  where external_ref is not null;

create table if not exists transaction_splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  amount_minor bigint not null,
  description text,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transfer_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  source_transaction_id uuid not null unique references transactions(id) on delete cascade,
  destination_transaction_id uuid not null unique references transactions(id) on delete cascade,
  source_account_id uuid not null references financial_accounts(id) on delete restrict,
  destination_account_id uuid not null references financial_accounts(id) on delete restrict,
  amount_minor bigint not null,
  fee_amount_minor bigint not null default 0,
  transfer_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount_minor >= 0),
  check (fee_amount_minor >= 0),
  check (source_account_id <> destination_account_id),
  check (source_transaction_id <> destination_transaction_id)
);

create table if not exists transaction_tags (
  user_id uuid not null references users(id) on delete cascade,
  transaction_id uuid not null references transactions(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);

-- =========================================================
-- GOALS
-- =========================================================

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  description text,
  type goal_type not null,
  status goal_status not null default 'active',
  currency varchar(3) not null default 'CAD',
  target_amount_minor bigint not null,
  current_amount_minor bigint not null default 0,
  target_date date,
  started_at date,
  completed_at date,
  priority int not null default 0,
  linked_account_id uuid references financial_accounts(id) on delete set null,
  linked_category_id uuid references categories(id) on delete set null,
  auto_allocate boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  goal_id uuid not null references goals(id) on delete cascade,
  account_id uuid references financial_accounts(id) on delete set null,
  transaction_id uuid references transactions(id) on delete set null,
  amount_minor bigint not null,
  contribution_date date not null,
  source goal_contribution_source not null default 'manual',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- ASSETS / LIABILITIES / NET WORTH
-- =========================================================

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  type asset_type not null,
  institution_name text,
  currency varchar(3) not null default 'CAD',
  quantity numeric(18,8),
  unit_cost_minor bigint,
  acquisition_value_minor bigint,
  current_value_minor bigint not null,
  valuation_date date,
  include_in_net_worth boolean not null default true,
  is_manual boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  type liability_type not null,
  institution_name text,
  currency varchar(3) not null default 'CAD',
  original_amount_minor bigint,
  current_balance_minor bigint not null,
  interest_rate_annual numeric(10,4),
  minimum_payment_minor bigint,
  due_day int check (due_day between 1 and 31),
  maturity_date date,
  include_in_net_worth boolean not null default true,
  is_manual boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  snapshot_date date not null,
  total_assets_minor bigint not null,
  total_liabilities_minor bigint not null,
  net_worth_minor bigint not null,
  currency varchar(3) not null default 'CAD',
  source snapshot_source not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

-- =========================================================
-- OPTIONAL REPORTING SNAPSHOTS
-- =========================================================

create table if not exists monthly_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  account_id uuid not null references financial_accounts(id) on delete cascade,
  month_key char(7) not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  opening_balance_minor bigint not null default 0,
  closing_balance_minor bigint not null default 0,
  inflows_minor bigint not null default 0,
  outflows_minor bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, month_key)
);

create table if not exists monthly_category_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  month_key char(7) not null check (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  assigned_minor bigint not null default 0,
  activity_minor bigint not null default 0,
  available_minor bigint not null default 0,
  check (assigned_minor >= 0),
  check (activity_minor >= 0),
  check (available_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, month_key)
);

-- =========================================================
-- FOREIGN KEY ADDITIONS FOR USER_PREFERENCES
-- =========================================================

alter table user_preferences
  add constraint fk_user_preferences_default_account
    foreign key (default_account_id) references financial_accounts(id) on delete set null,
  add constraint fk_user_preferences_default_income_category
    foreign key (default_income_category_id) references categories(id) on delete set null,
  add constraint fk_user_preferences_default_expense_category
    foreign key (default_expense_category_id) references categories(id) on delete set null;

-- =========================================================
-- UPDATED_AT TRIGGER
-- =========================================================

create or replace function app.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users',
    'auth_sessions',
    'user_preferences',
    'institutions',
    'connections',
    'budgets',
    'category_groups',
    'categories',
    'budget_months',
    'category_months',
    'category_targets',
    'financial_accounts',
    'merchants',
    'tags',
    'credit_card_statements',
    'recurring_rules',
    'transactions',
    'transaction_splits',
    'transfer_links',
    'goals',
    'goal_contributions',
    'assets',
    'liabilities',
    'net_worth_snapshots',
    'monthly_account_snapshots',
    'monthly_category_snapshots'
  ]
  loop
    execute format('
      drop trigger if exists trg_%I_updated_at on %I;
      create trigger trg_%I_updated_at
      before update on %I
      for each row
      execute function app.set_updated_at();
    ', t, t, t, t);
  end loop;
end$$;

-- =========================================================
-- OWNERSHIP CONSISTENCY VALIDATION
-- =========================================================

create or replace function app.trg_validate_category_groups_ownership()
returns trigger
language plpgsql
as $$
declare
  b_user_id uuid;
begin
  select user_id into b_user_id from budgets where id = NEW.budget_id;
  if b_user_id is null then
    raise exception 'Invalid budget_id for category_groups';
  end if;
  if NEW.user_id <> b_user_id then
    raise exception 'category_groups.user_id must match budgets.user_id';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_category_groups_validate_ownership on category_groups;
create trigger trg_category_groups_validate_ownership
before insert or update on category_groups
for each row
execute function app.trg_validate_category_groups_ownership();

create or replace function app.trg_validate_categories_ownership()
returns trigger
language plpgsql
as $$
declare
  cg_user_id uuid;
  cg_budget_id uuid;
  parent_user_id uuid;
  parent_budget_id uuid;
begin
  select user_id, budget_id
    into cg_user_id, cg_budget_id
  from category_groups
  where id = NEW.category_group_id;

  if cg_user_id is null then
    raise exception 'Invalid category_group_id for categories';
  end if;

  if NEW.user_id <> cg_user_id then
    raise exception 'categories.user_id must match category_groups.user_id';
  end if;
  if NEW.budget_id <> cg_budget_id then
    raise exception 'categories.budget_id must match category_groups.budget_id';
  end if;

  if NEW.parent_category_id is not null then
    select user_id, budget_id
      into parent_user_id, parent_budget_id
    from categories
    where id = NEW.parent_category_id;

    if parent_user_id is null then
      raise exception 'Invalid parent_category_id for categories';
    end if;
    if NEW.user_id <> parent_user_id then
      raise exception 'categories.parent_category must belong to the same user';
    end if;
    if NEW.budget_id <> parent_budget_id then
      raise exception 'categories.parent_category must belong to the same budget';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_categories_validate_ownership on categories;
create trigger trg_categories_validate_ownership
before insert or update on categories
for each row
execute function app.trg_validate_categories_ownership();

create or replace function app.trg_validate_budget_months_ownership()
returns trigger
language plpgsql
as $$
declare
  b_user_id uuid;
begin
  select user_id into b_user_id from budgets where id = NEW.budget_id;
  if b_user_id is null then
    raise exception 'Invalid budget_id for budget_months';
  end if;
  if NEW.user_id <> b_user_id then
    raise exception 'budget_months.user_id must match budgets.user_id';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_budget_months_validate_ownership on budget_months;
create trigger trg_budget_months_validate_ownership
before insert or update on budget_months
for each row
execute function app.trg_validate_budget_months_ownership();

create or replace function app.trg_validate_category_months_ownership()
returns trigger
language plpgsql
as $$
declare
  bm_user_id uuid;
  bm_budget_id uuid;
  c_user_id uuid;
  c_budget_id uuid;
begin
  select user_id, budget_id
    into bm_user_id, bm_budget_id
  from budget_months
  where id = NEW.budget_month_id;

  if bm_user_id is null then
    raise exception 'Invalid budget_month_id for category_months';
  end if;

  select user_id, budget_id
    into c_user_id, c_budget_id
  from categories
  where id = NEW.category_id;

  if c_user_id is null then
    raise exception 'Invalid category_id for category_months';
  end if;

  if NEW.user_id <> bm_user_id then
    raise exception 'category_months.user_id must match budget_months.user_id';
  end if;
  if NEW.user_id <> c_user_id then
    raise exception 'category_months.user_id must match categories.user_id';
  end if;
  if bm_budget_id <> c_budget_id then
    raise exception 'category_months budget_month and category must belong to the same budget';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_category_months_validate_ownership on category_months;
create trigger trg_category_months_validate_ownership
before insert or update on category_months
for each row
execute function app.trg_validate_category_months_ownership();

create or replace function app.trg_validate_category_targets_ownership()
returns trigger
language plpgsql
as $$
declare
  c_user_id uuid;
begin
  select user_id into c_user_id from categories where id = NEW.category_id;
  if c_user_id is null then
    raise exception 'Invalid category_id for category_targets';
  end if;
  if NEW.user_id <> c_user_id then
    raise exception 'category_targets.user_id must match categories.user_id';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_category_targets_validate_ownership on category_targets;
create trigger trg_category_targets_validate_ownership
before insert or update on category_targets
for each row
execute function app.trg_validate_category_targets_ownership();

create or replace function app.trg_validate_budget_assignment_events_ownership()
returns trigger
language plpgsql
as $$
declare
  b_user_id uuid;
  b_budget_id uuid;
  bm_user_id uuid;
  bm_budget_id uuid;
  cat_user_id uuid;
  cat_budget_id uuid;
  src_user_id uuid;
  src_budget_id uuid;
begin
  select user_id, id into b_user_id, b_budget_id from budgets where id = NEW.budget_id;
  if b_user_id is null then
    raise exception 'Invalid budget_id for budget_assignment_events';
  end if;

  select user_id, budget_id
    into bm_user_id, bm_budget_id
  from budget_months
  where id = NEW.budget_month_id;

  if bm_user_id is null then
    raise exception 'Invalid budget_month_id for budget_assignment_events';
  end if;

  select user_id, budget_id
    into cat_user_id, cat_budget_id
  from categories
  where id = NEW.category_id;

  if cat_user_id is null then
    raise exception 'Invalid category_id for budget_assignment_events';
  end if;

  if NEW.user_id <> b_user_id then
    raise exception 'budget_assignment_events.user_id must match budgets.user_id';
  end if;
  if NEW.user_id <> bm_user_id then
    raise exception 'budget_assignment_events.user_id must match budget_months.user_id';
  end if;
  if NEW.user_id <> cat_user_id then
    raise exception 'budget_assignment_events.user_id must match categories.user_id';
  end if;

  if NEW.budget_id <> bm_budget_id then
    raise exception 'budget_assignment_events.budget_id must match budget_months.budget_id';
  end if;
  if bm_budget_id <> cat_budget_id then
    raise exception 'budget_assignment_events budget_month and category must belong to the same budget';
  end if;

  if NEW.source_category_id is not null then
    select user_id, budget_id
      into src_user_id, src_budget_id
    from categories
    where id = NEW.source_category_id;

    if src_user_id is null then
      raise exception 'Invalid source_category_id for budget_assignment_events';
    end if;

    if NEW.user_id <> src_user_id then
      raise exception 'budget_assignment_events.user_id must match source categories.user_id';
    end if;
    if src_budget_id <> bm_budget_id then
      raise exception 'budget_assignment_events source category must belong to the same budget';
    end if;
  end if;

  if NEW.created_by_user_id <> NEW.user_id then
    raise exception 'budget_assignment_events.created_by_user_id must equal budget_assignment_events.user_id';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_budget_assignment_events_validate_ownership on budget_assignment_events;
create trigger trg_budget_assignment_events_validate_ownership
before insert or update on budget_assignment_events
for each row
execute function app.trg_validate_budget_assignment_events_ownership();

create or replace function app.trg_validate_financial_accounts_ownership()
returns trigger
language plpgsql
as $$
declare
  inst_user_id uuid;
  conn_user_id uuid;
begin
  if NEW.institution_id is not null then
    select user_id into inst_user_id from institutions where id = NEW.institution_id;
    if inst_user_id is null then
      raise exception 'Invalid institution_id for financial_accounts';
    end if;
    if NEW.user_id <> inst_user_id then
      raise exception 'financial_accounts.user_id must match institutions.user_id';
    end if;
  end if;

  if NEW.connection_id is not null then
    select user_id into conn_user_id from connections where id = NEW.connection_id;
    if conn_user_id is null then
      raise exception 'Invalid connection_id for financial_accounts';
    end if;
    if NEW.user_id <> conn_user_id then
      raise exception 'financial_accounts.user_id must match connections.user_id';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_financial_accounts_validate_ownership on financial_accounts;
create trigger trg_financial_accounts_validate_ownership
before insert or update on financial_accounts
for each row
execute function app.trg_validate_financial_accounts_ownership();

create or replace function app.trg_validate_connections_ownership()
returns trigger
language plpgsql
as $$
declare
  inst_user_id uuid;
begin
  if NEW.institution_id is not null then
    select user_id into inst_user_id from institutions where id = NEW.institution_id;
    if inst_user_id is null then
      raise exception 'Invalid institution_id for connections';
    end if;
    if NEW.user_id <> inst_user_id then
      raise exception 'connections.user_id must match institutions.user_id';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_connections_validate_ownership on connections;
create trigger trg_connections_validate_ownership
before insert or update on connections
for each row
execute function app.trg_validate_connections_ownership();

create or replace function app.trg_validate_credit_card_statements_ownership()
returns trigger
language plpgsql
as $$
declare
  acct_user_id uuid;
begin
  select user_id into acct_user_id from financial_accounts where id = NEW.account_id;
  if acct_user_id is null then
    raise exception 'Invalid account_id for credit_card_statements';
  end if;
  if NEW.user_id <> acct_user_id then
    raise exception 'credit_card_statements.user_id must match financial_accounts.user_id';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_credit_card_statements_validate_ownership on credit_card_statements;
create trigger trg_credit_card_statements_validate_ownership
before insert or update on credit_card_statements
for each row
execute function app.trg_validate_credit_card_statements_ownership();

create or replace function app.trg_validate_recurring_rules_ownership()
returns trigger
language plpgsql
as $$
declare
  acct_user_id uuid;
  cat_user_id uuid;
  merch_user_id uuid;
begin
  if NEW.account_id is not null then
    select user_id into acct_user_id from financial_accounts where id = NEW.account_id;
    if acct_user_id is null then
      raise exception 'Invalid account_id for recurring_rules';
    end if;
    if NEW.user_id <> acct_user_id then
      raise exception 'recurring_rules.user_id must match financial_accounts.user_id';
    end if;
  end if;

  if NEW.category_id is not null then
    select user_id into cat_user_id from categories where id = NEW.category_id;
    if cat_user_id is null then
      raise exception 'Invalid category_id for recurring_rules';
    end if;
    if NEW.user_id <> cat_user_id then
      raise exception 'recurring_rules.user_id must match categories.user_id';
    end if;
  end if;

  if NEW.merchant_id is not null then
    select user_id into merch_user_id from merchants where id = NEW.merchant_id;
    if merch_user_id is null then
      raise exception 'Invalid merchant_id for recurring_rules';
    end if;
    if NEW.user_id <> merch_user_id then
      raise exception 'recurring_rules.user_id must match merchants.user_id';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_recurring_rules_validate_ownership on recurring_rules;
create trigger trg_recurring_rules_validate_ownership
before insert or update on recurring_rules
for each row
execute function app.trg_validate_recurring_rules_ownership();

create or replace function app.trg_validate_transactions_ownership()
returns trigger
language plpgsql
as $$
declare
  acct_user_id uuid;
  budget_user_id uuid;
  cat_user_id uuid;
  cat_budget_id uuid;
  merch_user_id uuid;
  stmt_user_id uuid;
  rule_user_id uuid;
  parent_user_id uuid;
begin
  select user_id into acct_user_id from financial_accounts where id = NEW.account_id;
  if acct_user_id is null then
    raise exception 'Invalid account_id for transactions';
  end if;
  if NEW.user_id <> acct_user_id then
    raise exception 'transactions.user_id must match financial_accounts.user_id';
  end if;

  if NEW.budget_id is not null then
    select user_id into budget_user_id from budgets where id = NEW.budget_id;
    if budget_user_id is null then
      raise exception 'Invalid budget_id for transactions';
    end if;
    if NEW.user_id <> budget_user_id then
      raise exception 'transactions.user_id must match budgets.user_id';
    end if;
  end if;

  if NEW.category_id is not null then
    select user_id, budget_id
      into cat_user_id, cat_budget_id
    from categories
    where id = NEW.category_id;
    if cat_user_id is null then
      raise exception 'Invalid category_id for transactions';
    end if;
    if NEW.user_id <> cat_user_id then
      raise exception 'transactions.user_id must match categories.user_id';
    end if;
    if NEW.budget_id is not null and cat_budget_id <> NEW.budget_id then
      raise exception 'transactions.category budget must match transactions.budget_id';
    end if;
  end if;

  if NEW.merchant_id is not null then
    select user_id into merch_user_id from merchants where id = NEW.merchant_id;
    if merch_user_id is null then
      raise exception 'Invalid merchant_id for transactions';
    end if;
    if NEW.user_id <> merch_user_id then
      raise exception 'transactions.user_id must match merchants.user_id';
    end if;
  end if;

  if NEW.statement_id is not null then
    select user_id into stmt_user_id from credit_card_statements where id = NEW.statement_id;
    if stmt_user_id is null then
      raise exception 'Invalid statement_id for transactions';
    end if;
    if NEW.user_id <> stmt_user_id then
      raise exception 'transactions.user_id must match credit_card_statements.user_id';
    end if;
  end if;

  if NEW.recurring_rule_id is not null then
    select user_id into rule_user_id from recurring_rules where id = NEW.recurring_rule_id;
    if rule_user_id is null then
      raise exception 'Invalid recurring_rule_id for transactions';
    end if;
    if NEW.user_id <> rule_user_id then
      raise exception 'transactions.user_id must match recurring_rules.user_id';
    end if;
  end if;

  if NEW.parent_transaction_id is not null then
    select user_id into parent_user_id from transactions where id = NEW.parent_transaction_id;
    if parent_user_id is null then
      raise exception 'Invalid parent_transaction_id for transactions';
    end if;
    if NEW.user_id <> parent_user_id then
      raise exception 'transactions.user_id must match parent transaction.user_id';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_transactions_validate_ownership on transactions;
create trigger trg_transactions_validate_ownership
before insert or update on transactions
for each row
execute function app.trg_validate_transactions_ownership();

create or replace function app.trg_validate_transaction_splits_ownership()
returns trigger
language plpgsql
as $$
declare
  tx_user_id uuid;
  cat_user_id uuid;
begin
  select user_id into tx_user_id from transactions where id = NEW.transaction_id;
  if tx_user_id is null then
    raise exception 'Invalid transaction_id for transaction_splits';
  end if;
  if NEW.user_id <> tx_user_id then
    raise exception 'transaction_splits.user_id must match transactions.user_id';
  end if;

  if NEW.category_id is not null then
    select user_id into cat_user_id from categories where id = NEW.category_id;
    if cat_user_id is null then
      raise exception 'Invalid category_id for transaction_splits';
    end if;
    if NEW.user_id <> cat_user_id then
      raise exception 'transaction_splits.user_id must match categories.user_id';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_transaction_splits_validate_ownership on transaction_splits;
create trigger trg_transaction_splits_validate_ownership
before insert or update on transaction_splits
for each row
execute function app.trg_validate_transaction_splits_ownership();

create or replace function app.trg_validate_transfer_links_integrity()
returns trigger
language plpgsql
as $$
declare
  src_tx_user_id uuid;
  src_tx_account_id uuid;
  src_tx_type transaction_type;
  dst_tx_user_id uuid;
  dst_tx_account_id uuid;
  dst_tx_type transaction_type;
  src_acct_user_id uuid;
  dst_acct_user_id uuid;
begin
  select user_id, account_id, type
    into src_tx_user_id, src_tx_account_id, src_tx_type
  from transactions
  where id = NEW.source_transaction_id;

  if src_tx_user_id is null then
    raise exception 'Invalid source_transaction_id for transfer_links';
  end if;

  select user_id, account_id, type
    into dst_tx_user_id, dst_tx_account_id, dst_tx_type
  from transactions
  where id = NEW.destination_transaction_id;

  if dst_tx_user_id is null then
    raise exception 'Invalid destination_transaction_id for transfer_links';
  end if;

  if src_tx_type <> 'transfer' or dst_tx_type <> 'transfer' then
    raise exception 'transfer_links source/destination transactions must have type = transfer';
  end if;

  select user_id into src_acct_user_id from financial_accounts where id = NEW.source_account_id;
  select user_id into dst_acct_user_id from financial_accounts where id = NEW.destination_account_id;

  if src_acct_user_id is null or dst_acct_user_id is null then
    raise exception 'Invalid source_account_id or destination_account_id for transfer_links';
  end if;

  if NEW.user_id <> src_tx_user_id or NEW.user_id <> dst_tx_user_id then
    raise exception 'transfer_links.user_id must match linked transactions.user_id';
  end if;
  if NEW.user_id <> src_acct_user_id or NEW.user_id <> dst_acct_user_id then
    raise exception 'transfer_links.user_id must match linked accounts.user_id';
  end if;

  if NEW.source_account_id <> src_tx_account_id then
    raise exception 'transfer_links.source_account_id must match source_transaction.account_id';
  end if;

  if NEW.destination_account_id <> dst_tx_account_id then
    raise exception 'transfer_links.destination_account_id must match destination_transaction.account_id';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_transfer_links_validate_integrity on transfer_links;
create trigger trg_transfer_links_validate_integrity
before insert or update on transfer_links
for each row
execute function app.trg_validate_transfer_links_integrity();

create or replace function app.trg_validate_transaction_tags_ownership()
returns trigger
language plpgsql
as $$
declare
  tx_user_id uuid;
  tag_user_id uuid;
begin
  select user_id into tx_user_id from transactions where id = NEW.transaction_id;
  if tx_user_id is null then
    raise exception 'Invalid transaction_id for transaction_tags';
  end if;

  select user_id into tag_user_id from tags where id = NEW.tag_id;
  if tag_user_id is null then
    raise exception 'Invalid tag_id for transaction_tags';
  end if;

  -- Backward-compatible: older app code likely didn't send transaction_tags.user_id.
  if NEW.user_id is null then
    NEW.user_id := tx_user_id;
  end if;

  if NEW.user_id <> tx_user_id then
    raise exception 'transaction_tags.user_id must match transactions.user_id';
  end if;

  if NEW.user_id <> tag_user_id then
    raise exception 'transaction_tags.user_id must match tags.user_id';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_transaction_tags_validate_ownership on transaction_tags;
create trigger trg_transaction_tags_validate_ownership
before insert or update on transaction_tags
for each row
execute function app.trg_validate_transaction_tags_ownership();

create or replace function app.trg_validate_goals_ownership()
returns trigger
language plpgsql
as $$
declare
  acct_user_id uuid;
  cat_user_id uuid;
begin
  if NEW.linked_account_id is not null then
    select user_id into acct_user_id from financial_accounts where id = NEW.linked_account_id;
    if acct_user_id is null then
      raise exception 'Invalid linked_account_id for goals';
    end if;
    if NEW.user_id <> acct_user_id then
      raise exception 'goals.user_id must match linked account.user_id';
    end if;
  end if;

  if NEW.linked_category_id is not null then
    select user_id into cat_user_id from categories where id = NEW.linked_category_id;
    if cat_user_id is null then
      raise exception 'Invalid linked_category_id for goals';
    end if;
    if NEW.user_id <> cat_user_id then
      raise exception 'goals.user_id must match linked category.user_id';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_goals_validate_ownership on goals;
create trigger trg_goals_validate_ownership
before insert or update on goals
for each row
execute function app.trg_validate_goals_ownership();

create or replace function app.trg_validate_goal_contributions_ownership()
returns trigger
language plpgsql
as $$
declare
  goal_user_id uuid;
  acct_user_id uuid;
  tx_user_id uuid;
  tx_account_id uuid;
begin
  select user_id into goal_user_id from goals where id = NEW.goal_id;
  if goal_user_id is null then
    raise exception 'Invalid goal_id for goal_contributions';
  end if;
  if NEW.user_id <> goal_user_id then
    raise exception 'goal_contributions.user_id must match goals.user_id';
  end if;

  if NEW.account_id is not null then
    select user_id into acct_user_id from financial_accounts where id = NEW.account_id;
    if acct_user_id is null then
      raise exception 'Invalid account_id for goal_contributions';
    end if;
    if NEW.user_id <> acct_user_id then
      raise exception 'goal_contributions.user_id must match financial_accounts.user_id';
    end if;
  end if;

  if NEW.transaction_id is not null then
    select user_id, account_id into tx_user_id, tx_account_id from transactions where id = NEW.transaction_id;
    if tx_user_id is null then
      raise exception 'Invalid transaction_id for goal_contributions';
    end if;
    if NEW.user_id <> tx_user_id then
      raise exception 'goal_contributions.user_id must match transactions.user_id';
    end if;
    if NEW.account_id is not null and tx_account_id <> NEW.account_id then
      raise exception 'goal_contributions.account_id must match transactions.account_id';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_goal_contributions_validate_ownership on goal_contributions;
create trigger trg_goal_contributions_validate_ownership
before insert or update on goal_contributions
for each row
execute function app.trg_validate_goal_contributions_ownership();

create or replace function app.trg_validate_monthly_account_snapshots_ownership()
returns trigger
language plpgsql
as $$
declare
  acct_user_id uuid;
begin
  select user_id into acct_user_id from financial_accounts where id = NEW.account_id;
  if acct_user_id is null then
    raise exception 'Invalid account_id for monthly_account_snapshots';
  end if;
  if NEW.user_id <> acct_user_id then
    raise exception 'monthly_account_snapshots.user_id must match financial_accounts.user_id';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_monthly_account_snapshots_validate_ownership on monthly_account_snapshots;
create trigger trg_monthly_account_snapshots_validate_ownership
before insert or update on monthly_account_snapshots
for each row
execute function app.trg_validate_monthly_account_snapshots_ownership();

create or replace function app.trg_validate_monthly_category_snapshots_ownership()
returns trigger
language plpgsql
as $$
declare
  cat_user_id uuid;
begin
  select user_id into cat_user_id from categories where id = NEW.category_id;
  if cat_user_id is null then
    raise exception 'Invalid category_id for monthly_category_snapshots';
  end if;
  if NEW.user_id <> cat_user_id then
    raise exception 'monthly_category_snapshots.user_id must match categories.user_id';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_monthly_category_snapshots_validate_ownership on monthly_category_snapshots;
create trigger trg_monthly_category_snapshots_validate_ownership
before insert or update on monthly_category_snapshots
for each row
execute function app.trg_validate_monthly_category_snapshots_ownership();

-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists idx_auth_sessions_user_status on auth_sessions(user_id, status);
create index if not exists idx_auth_sessions_expires_at on auth_sessions(expires_at);

create index if not exists idx_institutions_user_name on institutions(user_id, name);
create index if not exists idx_connections_user_provider_status on connections(user_id, provider, status);

create index if not exists idx_budgets_user_status on budgets(user_id, status);

create index if not exists idx_category_groups_user_budget_sort on category_groups(user_id, budget_id, sort_order);
create index if not exists idx_categories_user_group_sort on categories(user_id, category_group_id, sort_order);
create index if not exists idx_categories_user_kind_active on categories(user_id, kind, is_active);

create index if not exists idx_budget_months_user_month on budget_months(user_id, month_key);
create index if not exists idx_category_months_user_budget_month_category on category_months(user_id, budget_month_id, category_id);
create index if not exists idx_category_targets_user_category on category_targets(user_id, category_id);
create index if not exists idx_budget_assignment_events_user_month_created on budget_assignment_events(user_id, budget_month_id, created_at);

create index if not exists idx_financial_accounts_user_kind_status on financial_accounts(user_id, kind, status);
create index if not exists idx_financial_accounts_institution on financial_accounts(institution_id);
create index if not exists idx_financial_accounts_connection on financial_accounts(connection_id);

create index if not exists idx_merchants_user_name on merchants(user_id, name);

create index if not exists idx_transactions_user_account_date on transactions(user_id, account_id, transaction_date);
create index if not exists idx_transactions_user_category_date on transactions(user_id, category_id, transaction_date);
create index if not exists idx_transactions_user_type_status_date on transactions(user_id, type, status, transaction_date);
create index if not exists idx_transactions_group_key on transactions(group_key);
create index if not exists idx_transactions_statement on transactions(statement_id);
create index if not exists idx_transactions_recurring_rule on transactions(recurring_rule_id);

create index if not exists idx_transaction_splits_user_transaction_sort on transaction_splits(user_id, transaction_id, sort_order);
create index if not exists idx_transfer_links_user_date on transfer_links(user_id, transfer_date);

create index if not exists idx_recurring_rules_user_status_next_run on recurring_rules(user_id, status, next_run_at);
create index if not exists idx_credit_card_statements_user_account_due on credit_card_statements(user_id, account_id, due_date);

create index if not exists idx_goals_user_status_type on goals(user_id, status, type);
create index if not exists idx_goal_contributions_user_goal_date on goal_contributions(user_id, goal_id, contribution_date);

create index if not exists idx_assets_user_type on assets(user_id, type);
create index if not exists idx_liabilities_user_type on liabilities(user_id, type);
create index if not exists idx_net_worth_snapshots_user_date on net_worth_snapshots(user_id, snapshot_date);

create index if not exists idx_monthly_account_snapshots_user_month on monthly_account_snapshots(user_id, month_key);
create index if not exists idx_monthly_category_snapshots_user_month on monthly_category_snapshots(user_id, month_key);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table user_preferences enable row level security;
alter table auth_sessions enable row level security;
alter table institutions enable row level security;
alter table connections enable row level security;
alter table budgets enable row level security;
alter table category_groups enable row level security;
alter table categories enable row level security;
alter table budget_months enable row level security;
alter table category_months enable row level security;
alter table category_targets enable row level security;
alter table budget_assignment_events enable row level security;
alter table financial_accounts enable row level security;
alter table merchants enable row level security;
alter table tags enable row level security;
alter table credit_card_statements enable row level security;
alter table recurring_rules enable row level security;
alter table transactions enable row level security;
alter table transaction_splits enable row level security;
alter table transaction_tags enable row level security;
alter table transfer_links enable row level security;
alter table goals enable row level security;
alter table goal_contributions enable row level security;
alter table assets enable row level security;
alter table liabilities enable row level security;
alter table net_worth_snapshots enable row level security;
alter table monthly_account_snapshots enable row level security;
alter table monthly_category_snapshots enable row level security;

-- Optional: force RLS even for owner roles
-- alter table ... force row level security;

-- Generic pattern:
-- select: user_id must match current session user
-- insert/update: row being written must also match current session user

create policy p_user_preferences_select on user_preferences
for select using (user_id = app.current_user_id());
create policy p_user_preferences_insert on user_preferences
for insert with check (user_id = app.current_user_id());
create policy p_user_preferences_update on user_preferences
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_user_preferences_delete on user_preferences
for delete using (user_id = app.current_user_id());

create policy p_auth_sessions_select on auth_sessions
for select using (user_id = app.current_user_id());
create policy p_auth_sessions_insert on auth_sessions
for insert with check (user_id = app.current_user_id());
create policy p_auth_sessions_update on auth_sessions
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_auth_sessions_delete on auth_sessions
for delete using (user_id = app.current_user_id());

create policy p_institutions_select on institutions
for select using (user_id = app.current_user_id());
create policy p_institutions_insert on institutions
for insert with check (user_id = app.current_user_id());
create policy p_institutions_update on institutions
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_institutions_delete on institutions
for delete using (user_id = app.current_user_id());

create policy p_connections_select on connections
for select using (user_id = app.current_user_id());
create policy p_connections_insert on connections
for insert with check (user_id = app.current_user_id());
create policy p_connections_update on connections
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_connections_delete on connections
for delete using (user_id = app.current_user_id());

create policy p_budgets_select on budgets
for select using (user_id = app.current_user_id());
create policy p_budgets_insert on budgets
for insert with check (user_id = app.current_user_id());
create policy p_budgets_update on budgets
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_budgets_delete on budgets
for delete using (user_id = app.current_user_id());

create policy p_category_groups_select on category_groups
for select using (user_id = app.current_user_id());
create policy p_category_groups_insert on category_groups
for insert with check (user_id = app.current_user_id());
create policy p_category_groups_update on category_groups
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_category_groups_delete on category_groups
for delete using (user_id = app.current_user_id());

create policy p_categories_select on categories
for select using (user_id = app.current_user_id());
create policy p_categories_insert on categories
for insert with check (user_id = app.current_user_id());
create policy p_categories_update on categories
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_categories_delete on categories
for delete using (user_id = app.current_user_id());

create policy p_budget_months_select on budget_months
for select using (user_id = app.current_user_id());
create policy p_budget_months_insert on budget_months
for insert with check (user_id = app.current_user_id());
create policy p_budget_months_update on budget_months
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_budget_months_delete on budget_months
for delete using (user_id = app.current_user_id());

create policy p_category_months_select on category_months
for select using (user_id = app.current_user_id());
create policy p_category_months_insert on category_months
for insert with check (user_id = app.current_user_id());
create policy p_category_months_update on category_months
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_category_months_delete on category_months
for delete using (user_id = app.current_user_id());

create policy p_category_targets_select on category_targets
for select using (user_id = app.current_user_id());
create policy p_category_targets_insert on category_targets
for insert with check (user_id = app.current_user_id());
create policy p_category_targets_update on category_targets
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_category_targets_delete on category_targets
for delete using (user_id = app.current_user_id());

create policy p_budget_assignment_events_select on budget_assignment_events
for select using (user_id = app.current_user_id());
create policy p_budget_assignment_events_insert on budget_assignment_events
for insert with check (user_id = app.current_user_id());
create policy p_budget_assignment_events_update on budget_assignment_events
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_budget_assignment_events_delete on budget_assignment_events
for delete using (user_id = app.current_user_id());

create policy p_financial_accounts_select on financial_accounts
for select using (user_id = app.current_user_id());
create policy p_financial_accounts_insert on financial_accounts
for insert with check (user_id = app.current_user_id());
create policy p_financial_accounts_update on financial_accounts
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_financial_accounts_delete on financial_accounts
for delete using (user_id = app.current_user_id());

create policy p_merchants_select on merchants
for select using (user_id = app.current_user_id());
create policy p_merchants_insert on merchants
for insert with check (user_id = app.current_user_id());
create policy p_merchants_update on merchants
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_merchants_delete on merchants
for delete using (user_id = app.current_user_id());

create policy p_tags_select on tags
for select using (user_id = app.current_user_id());
create policy p_tags_insert on tags
for insert with check (user_id = app.current_user_id());
create policy p_tags_update on tags
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_tags_delete on tags
for delete using (user_id = app.current_user_id());

create policy p_credit_card_statements_select on credit_card_statements
for select using (user_id = app.current_user_id());
create policy p_credit_card_statements_insert on credit_card_statements
for insert with check (user_id = app.current_user_id());
create policy p_credit_card_statements_update on credit_card_statements
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_credit_card_statements_delete on credit_card_statements
for delete using (user_id = app.current_user_id());

create policy p_recurring_rules_select on recurring_rules
for select using (user_id = app.current_user_id());
create policy p_recurring_rules_insert on recurring_rules
for insert with check (user_id = app.current_user_id());
create policy p_recurring_rules_update on recurring_rules
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_recurring_rules_delete on recurring_rules
for delete using (user_id = app.current_user_id());

create policy p_transactions_select on transactions
for select using (user_id = app.current_user_id());
create policy p_transactions_insert on transactions
for insert with check (user_id = app.current_user_id());
create policy p_transactions_update on transactions
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_transactions_delete on transactions
for delete using (user_id = app.current_user_id());

create policy p_transaction_splits_select on transaction_splits
for select using (user_id = app.current_user_id());
create policy p_transaction_splits_insert on transaction_splits
for insert with check (user_id = app.current_user_id());
create policy p_transaction_splits_update on transaction_splits
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_transaction_splits_delete on transaction_splits
for delete using (user_id = app.current_user_id());

create policy p_transaction_tags_select on transaction_tags
for select using (user_id = app.current_user_id());
create policy p_transaction_tags_insert on transaction_tags
for insert with check (user_id = app.current_user_id());
create policy p_transaction_tags_update on transaction_tags
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_transaction_tags_delete on transaction_tags
for delete using (user_id = app.current_user_id());

create policy p_transfer_links_select on transfer_links
for select using (user_id = app.current_user_id());
create policy p_transfer_links_insert on transfer_links
for insert with check (user_id = app.current_user_id());
create policy p_transfer_links_update on transfer_links
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_transfer_links_delete on transfer_links
for delete using (user_id = app.current_user_id());

create policy p_goals_select on goals
for select using (user_id = app.current_user_id());
create policy p_goals_insert on goals
for insert with check (user_id = app.current_user_id());
create policy p_goals_update on goals
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_goals_delete on goals
for delete using (user_id = app.current_user_id());

create policy p_goal_contributions_select on goal_contributions
for select using (user_id = app.current_user_id());
create policy p_goal_contributions_insert on goal_contributions
for insert with check (user_id = app.current_user_id());
create policy p_goal_contributions_update on goal_contributions
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_goal_contributions_delete on goal_contributions
for delete using (user_id = app.current_user_id());

create policy p_assets_select on assets
for select using (user_id = app.current_user_id());
create policy p_assets_insert on assets
for insert with check (user_id = app.current_user_id());
create policy p_assets_update on assets
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_assets_delete on assets
for delete using (user_id = app.current_user_id());

create policy p_liabilities_select on liabilities
for select using (user_id = app.current_user_id());
create policy p_liabilities_insert on liabilities
for insert with check (user_id = app.current_user_id());
create policy p_liabilities_update on liabilities
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_liabilities_delete on liabilities
for delete using (user_id = app.current_user_id());

create policy p_net_worth_snapshots_select on net_worth_snapshots
for select using (user_id = app.current_user_id());
create policy p_net_worth_snapshots_insert on net_worth_snapshots
for insert with check (user_id = app.current_user_id());
create policy p_net_worth_snapshots_update on net_worth_snapshots
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_net_worth_snapshots_delete on net_worth_snapshots
for delete using (user_id = app.current_user_id());

create policy p_monthly_account_snapshots_select on monthly_account_snapshots
for select using (user_id = app.current_user_id());
create policy p_monthly_account_snapshots_insert on monthly_account_snapshots
for insert with check (user_id = app.current_user_id());
create policy p_monthly_account_snapshots_update on monthly_account_snapshots
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_monthly_account_snapshots_delete on monthly_account_snapshots
for delete using (user_id = app.current_user_id());

create policy p_monthly_category_snapshots_select on monthly_category_snapshots
for select using (user_id = app.current_user_id());
create policy p_monthly_category_snapshots_insert on monthly_category_snapshots
for insert with check (user_id = app.current_user_id());
create policy p_monthly_category_snapshots_update on monthly_category_snapshots
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_monthly_category_snapshots_delete on monthly_category_snapshots
for delete using (user_id = app.current_user_id());

-- =========================================================
-- SEED EXAMPLE CATEGORY GROUPS / CATEGORIES
-- =========================================================
-- Example only. Replace user_id / budget_id with real values.
-- insert into category_groups (user_id, budget_id, name, sort_order, is_system)
-- values
--   ('<user_uuid>', '<budget_uuid>', 'Bills', 1, true),
--   ('<user_uuid>', '<budget_uuid>', 'Needs', 2, true),
--   ('<user_uuid>', '<budget_uuid>', 'Wants', 3, true);

-- =========================================================
-- END
-- =========================================================
