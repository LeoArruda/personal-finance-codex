-- Bills: scheduled payables linked to payment account (and optional category / statement).

set search_path to app, public;

create type bill_status as enum (
  'pending',
  'paid',
  'cancelled'
);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  from_account_id uuid not null references financial_accounts(id) on delete restrict,
  category_id uuid references categories(id) on delete set null,
  statement_id uuid references credit_card_statements(id) on delete set null,
  payee_name text not null,
  amount_minor bigint not null,
  currency varchar(3) not null default 'CAD',
  due_date date not null,
  status bill_status not null default 'pending',
  paid_at timestamptz,
  paid_transaction_id uuid references transactions(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint bills_amount_minor_positive check (amount_minor > 0)
);

create index if not exists idx_bills_user_status_due on bills(user_id, status, due_date);

create or replace function app.trg_validate_bills_ownership()
returns trigger
language plpgsql
as $$
declare
  acct_user_id uuid;
  cat_user_id uuid;
  stmt_user_id uuid;
  tx_user_id uuid;
begin
  select user_id into acct_user_id from financial_accounts where id = NEW.from_account_id;
  if acct_user_id is null then
    raise exception 'Invalid from_account_id for bills';
  end if;
  if NEW.user_id <> acct_user_id then
    raise exception 'bills.user_id must match financial_accounts.user_id for from_account_id';
  end if;

  if NEW.category_id is not null then
    select user_id into cat_user_id from categories where id = NEW.category_id;
    if cat_user_id is null then
      raise exception 'Invalid category_id for bills';
    end if;
    if NEW.user_id <> cat_user_id then
      raise exception 'bills.user_id must match categories.user_id';
    end if;
  end if;

  if NEW.statement_id is not null then
    select user_id into stmt_user_id from credit_card_statements where id = NEW.statement_id;
    if stmt_user_id is null then
      raise exception 'Invalid statement_id for bills';
    end if;
    if NEW.user_id <> stmt_user_id then
      raise exception 'bills.user_id must match credit_card_statements.user_id';
    end if;
  end if;

  if NEW.paid_transaction_id is not null then
    select user_id into tx_user_id from transactions where id = NEW.paid_transaction_id;
    if tx_user_id is null then
      raise exception 'Invalid paid_transaction_id for bills';
    end if;
    if NEW.user_id <> tx_user_id then
      raise exception 'bills.user_id must match transactions.user_id for paid_transaction_id';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_bills_validate_ownership on bills;
create trigger trg_bills_validate_ownership
before insert or update on bills
for each row
execute function app.trg_validate_bills_ownership();

alter table bills enable row level security;

create policy p_bills_select on bills
for select using (user_id = app.current_user_id());
create policy p_bills_insert on bills
for insert with check (user_id = app.current_user_id());
create policy p_bills_update on bills
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_bills_delete on bills
for delete using (user_id = app.current_user_id());
