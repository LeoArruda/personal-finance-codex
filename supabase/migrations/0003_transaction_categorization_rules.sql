-- Minimal categorization rules: payee substring match -> category (user-scoped, RLS).

set search_path to app, public;

create table if not exists transaction_categorization_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  priority int not null default 0,
  payee_contains text not null,
  category_id uuid not null references categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transaction_categorization_rules_payee_nonempty check (length(trim(payee_contains::text)) > 0)
);

create index if not exists idx_tx_cat_rules_user_priority
  on transaction_categorization_rules (user_id, priority desc, created_at asc);

create or replace function app.trg_validate_transaction_categorization_rules_ownership()
returns trigger
language plpgsql
as $$
declare
  cat_user_id uuid;
begin
  select user_id into cat_user_id from categories where id = NEW.category_id;
  if cat_user_id is null then
    raise exception 'Invalid category_id for transaction_categorization_rules';
  end if;
  if NEW.user_id <> cat_user_id then
    raise exception 'transaction_categorization_rules.user_id must match categories.user_id';
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_transaction_categorization_rules_validate on transaction_categorization_rules;
create trigger trg_transaction_categorization_rules_validate
before insert or update on transaction_categorization_rules
for each row
execute function app.trg_validate_transaction_categorization_rules_ownership();

alter table transaction_categorization_rules enable row level security;

create policy p_transaction_categorization_rules_select on transaction_categorization_rules
for select using (user_id = app.current_user_id());
create policy p_transaction_categorization_rules_insert on transaction_categorization_rules
for insert with check (user_id = app.current_user_id());
create policy p_transaction_categorization_rules_update on transaction_categorization_rules
for update using (user_id = app.current_user_id())
with check (user_id = app.current_user_id());
create policy p_transaction_categorization_rules_delete on transaction_categorization_rules
for delete using (user_id = app.current_user_id());
