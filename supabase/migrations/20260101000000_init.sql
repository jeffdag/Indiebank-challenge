create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name      text;

alter table public.profiles add column if not exists role             text not null default 'operator';
alter table public.profiles add column if not exists hourly_rate_usd  numeric(10,2);

alter table public.profiles add column if not exists business_name             text;
alter table public.profiles add column if not exists business_type             text;
alter table public.profiles add column if not exists country                   text;
alter table public.profiles add column if not exists dakota_customer_id        text;
alter table public.profiles add column if not exists dakota_application_id     text;
alter table public.profiles add column if not exists kyb_status                text;
alter table public.profiles add column if not exists onboarding_url            text;
alter table public.profiles add column if not exists dakota_wallet_id          text;
alter table public.profiles add column if not exists dakota_wallet_address     text;
alter table public.profiles add column if not exists dakota_onramp_account_id  text;

alter table public.profiles add column if not exists bank_name             text;
alter table public.profiles add column if not exists routing_number        text;
alter table public.profiles add column if not exists account_number        text;
alter table public.profiles add column if not exists account_holder_name   text;
alter table public.profiles add column if not exists account_type          text default 'checking';
alter table public.profiles add column if not exists account_last4         text;
alter table public.profiles add column if not exists street1               text;
alter table public.profiles add column if not exists city                  text;
alter table public.profiles add column if not exists region                text;
alter table public.profiles add column if not exists postal_code           text;
alter table public.profiles add column if not exists address_country       text default 'US';

alter table public.profiles add column if not exists dakota_recipient_id       text;
alter table public.profiles add column if not exists dakota_destination_id     text;
alter table public.profiles add column if not exists dakota_offramp_account_id text;
alter table public.profiles add column if not exists provisioned_by_user_id    uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('operator','freelancer'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_kyb_status_check') then
    alter table public.profiles
      add constraint profiles_kyb_status_check check (kyb_status is null or kyb_status in ('pending','under_review','active','rejected'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_account_type_check') then
    alter table public.profiles
      add constraint profiles_account_type_check check (account_type is null or account_type in ('checking','savings'));
  end if;
end$$;

create unique index if not exists profiles_dakota_customer_id_key
  on public.profiles (dakota_customer_id)
  where dakota_customer_id is not null;
create unique index if not exists profiles_dakota_application_id_key
  on public.profiles (dakota_application_id)
  where dakota_application_id is not null;

create index if not exists idx_profiles_role
  on public.profiles (role);
create index if not exists idx_profiles_dakota_customer_id
  on public.profiles (dakota_customer_id);
create index if not exists idx_profiles_dakota_application_id
  on public.profiles (dakota_application_id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role, hourly_rate_usd, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'operator'),
    nullif(new.raw_user_meta_data->>'hourly_rate_usd','')::numeric,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.customer_provisioning (
  dakota_customer_id  text primary key,
  display_name        text not null,
  country             text default 'US',
  bank_name           text,
  routing_number      text,
  account_number      text,
  account_type        text default 'checking',
  recipient_id        text,
  destination_id      text,
  offramp_account_id  text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.payment_amounts (
  dakota_transaction_id text primary key,
  user_id               uuid references auth.users(id) on delete cascade not null,
  amount                text not null,
  currency              text not null default 'USD',
  created_at            timestamptz not null default now()
);

create index if not exists idx_payment_amounts_user_id on public.payment_amounts (user_id);

create table if not exists public.jobs (
  id                           uuid primary key default uuid_generate_v4(),
  created_by                   uuid not null references public.profiles(id) on delete cascade,
  assigned_to                  uuid references public.profiles(id) on delete set null,

  title                        text not null,
  requirements                 text not null,
  design_url                   text,
  estimated_hours              numeric(8,2),

  status                       text not null default 'open',

  last_submission_id           uuid,
  paid_dakota_transaction_id   text,

  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

alter table public.jobs add column if not exists design_url                 text;
alter table public.jobs add column if not exists estimated_hours            numeric(8,2);
alter table public.jobs add column if not exists last_submission_id         uuid;
alter table public.jobs add column if not exists paid_dakota_transaction_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'jobs_status_check') then
    alter table public.jobs
      add constraint jobs_status_check check (status in (
        'open','assigned','submitted','reviewing',
        'revisions_requested','approved','paid'
      ));
  end if;
end$$;

create index if not exists idx_jobs_created_by  on public.jobs (created_by);
create index if not exists idx_jobs_assigned_to on public.jobs (assigned_to);
create index if not exists idx_jobs_status      on public.jobs (status);

create table if not exists public.job_submissions (
  id                  uuid primary key default uuid_generate_v4(),
  job_id              uuid not null references public.jobs(id) on delete cascade,
  submitted_by        uuid references public.profiles(id) on delete set null,

  hours_worked        numeric(8,2) not null check (hours_worked > 0),
  deliverables_url    text,
  notes               text,

  agent_decision      text,
  agent_feedback      text,
  agent_checklist     jsonb,
  reviewed_at         timestamptz,

  created_at          timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_submissions_decision_check') then
    alter table public.job_submissions
      add constraint job_submissions_decision_check
      check (agent_decision is null or agent_decision in ('approve','request_revisions'));
  end if;
end$$;

create index if not exists idx_job_submissions_job on public.job_submissions (job_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jobs_last_submission_fk'
  ) then
    alter table public.jobs
      add constraint jobs_last_submission_fk
      foreign key (last_submission_id)
      references public.job_submissions(id)
      on delete set null
      deferrable initially deferred;
  end if;
end$$;

alter table public.profiles               enable row level security;
alter table public.customer_provisioning  enable row level security;
alter table public.payment_amounts        enable row level security;
alter table public.jobs                   enable row level security;
alter table public.job_submissions        enable row level security;

drop policy if exists "Users can view own profile"          on public.profiles;
drop policy if exists "Users can update own profile"        on public.profiles;
drop policy if exists "profiles_select_self_or_others"      on public.profiles;
drop policy if exists "profiles_update_self_or_freelancer"  on public.profiles;

create policy "profiles_select_self_or_others" on public.profiles
  for select using (
    auth.uid() = id
    or (
      role = 'freelancer'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'operator'
      )
    )
    or (
      role = 'operator'
      and exists (
        select 1 from public.jobs j
        where j.created_by = profiles.id and j.assigned_to = auth.uid()
      )
    )
  );

create policy "profiles_update_self_or_freelancer" on public.profiles
  for update using (
    auth.uid() = id
    or (
      role = 'freelancer'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'operator'
      )
    )
  )
  with check (
    auth.uid() = id
    or (
      role = 'freelancer'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'operator'
      )
    )
  );

drop policy if exists "operator full access" on public.customer_provisioning;
create policy "operator full access" on public.customer_provisioning
  for all to authenticated using (true) with check (true);

drop policy if exists "users manage own payment amounts" on public.payment_amounts;
create policy "users manage own payment amounts" on public.payment_amounts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "jobs_operator_all"             on public.jobs;
drop policy if exists "jobs_freelancer_read_assigned" on public.jobs;

create policy "jobs_operator_all" on public.jobs
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operator')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "jobs_freelancer_read_assigned" on public.jobs
  for select using (assigned_to = auth.uid());

drop policy if exists "job_submissions_operator_all"      on public.job_submissions;
drop policy if exists "job_submissions_freelancer_own"    on public.job_submissions;
drop policy if exists "job_submissions_freelancer_insert" on public.job_submissions;

create policy "job_submissions_operator_all" on public.job_submissions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operator')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'operator')
  );

create policy "job_submissions_freelancer_own" on public.job_submissions
  for select using (submitted_by = auth.uid());

create policy "job_submissions_freelancer_insert" on public.job_submissions
  for insert with check (
    submitted_by = auth.uid()
    and exists (
      select 1 from public.jobs j
      where j.id = job_id and j.assigned_to = auth.uid()
    )
  );
