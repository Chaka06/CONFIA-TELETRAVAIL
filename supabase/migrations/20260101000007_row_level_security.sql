-- ============================================================================
-- 0007 — Row Level Security
-- ============================================================================

create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'));
$$;

create function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'super_admin');
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles for select using (id = auth.uid());
create policy profiles_select_admin on public.profiles for select using (public.is_admin());
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create function public.profiles_guard_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.email_verified_at := old.email_verified_at;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged_fields before update on public.profiles
  for each row execute function public.profiles_guard_privileged_fields();

-- ----------------------------------------------------------------------------
-- tontine_basket_types : référentiel public (nécessaire pour afficher les
-- paniers disponibles sur la page d'accueil, avant connexion).
-- ----------------------------------------------------------------------------
alter table public.tontine_basket_types enable row level security;
create policy basket_types_select_all on public.tontine_basket_types for select using (true);

-- ----------------------------------------------------------------------------
-- tontine_basket_instances : lecture par tout utilisateur connecté (état
-- agrégé d'un panier, aucune donnée personnelle d'autrui).
-- ----------------------------------------------------------------------------
alter table public.tontine_basket_instances enable row level security;
create policy basket_instances_select_authenticated on public.tontine_basket_instances for select to authenticated using (true);
create policy basket_instances_select_admin on public.tontine_basket_instances for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- tontine_memberships : un membre voit sa propre ligne, et les autres membres
-- du/des panier(s) dont il fait lui-même partie (file d'attente visible).
-- ----------------------------------------------------------------------------
alter table public.tontine_memberships enable row level security;

create policy memberships_select_own on public.tontine_memberships for select using (user_id = auth.uid());

create policy memberships_select_same_basket on public.tontine_memberships for select using (
  exists (
    select 1 from public.tontine_memberships mine
    where mine.basket_instance_id = tontine_memberships.basket_instance_id and mine.user_id = auth.uid()
  )
);

create policy memberships_select_admin on public.tontine_memberships for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- tontine_contributions : uniquement ses propres cotisations (+ admin).
-- ----------------------------------------------------------------------------
alter table public.tontine_contributions enable row level security;

create policy contributions_select_own on public.tontine_contributions for select using (
  exists (select 1 from public.tontine_memberships m where m.id = tontine_contributions.membership_id and m.user_id = auth.uid())
);

create policy contributions_select_admin on public.tontine_contributions for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- tontine_payouts : le bénéficiaire voit son propre gain (+ admin, qui gère
-- le traitement). L'accès public par jeton passe par la fonction dédiée,
-- jamais par une lecture directe de la table.
-- ----------------------------------------------------------------------------
alter table public.tontine_payouts enable row level security;

create policy payouts_select_own on public.tontine_payouts for select using (
  exists (select 1 from public.tontine_memberships m where m.id = tontine_payouts.membership_id and m.user_id = auth.uid())
);

create policy payouts_select_admin on public.tontine_payouts for select using (public.is_admin());

-- ----------------------------------------------------------------------------
-- transactions, notifications
-- ----------------------------------------------------------------------------
alter table public.transactions enable row level security;
create policy transactions_select_own on public.transactions for select using (user_id = auth.uid());
create policy transactions_select_admin on public.transactions for select using (public.is_admin());

alter table public.notifications enable row level security;
create policy notifications_select_own on public.notifications for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.notifications_guard_fields()
returns trigger
language plpgsql
as $$
begin
  new.user_id := old.user_id;
  new.type := old.type;
  new.title := old.title;
  new.body := old.body;
  new.metadata := old.metadata;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger notifications_guard_fields before update on public.notifications
  for each row execute function public.notifications_guard_fields();

-- ----------------------------------------------------------------------------
-- audit_logs, email_logs, email_verification_codes : réservés au service_role
-- (et lecture admin pour l'audit).
-- ----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;
create policy audit_logs_select_admin on public.audit_logs for select using (public.is_admin());

alter table public.email_logs enable row level security;

alter table public.email_verification_codes enable row level security;

-- ----------------------------------------------------------------------------
-- platform_settings : lecture publique (transparence des règles), écriture
-- réservée au super_admin.
-- ----------------------------------------------------------------------------
alter table public.platform_settings enable row level security;
create policy platform_settings_select_all on public.platform_settings for select using (true);
create policy platform_settings_write_super_admin on public.platform_settings
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- Grants
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on
  public.profiles,
  public.platform_settings,
  public.tontine_basket_types,
  public.tontine_basket_instances,
  public.tontine_memberships,
  public.tontine_contributions,
  public.tontine_payouts,
  public.transactions,
  public.notifications
to authenticated;

grant update on public.profiles to authenticated;
grant update on public.notifications to authenticated;

revoke all on all tables in schema public from anon;
grant usage on schema public to anon;
grant select on public.tontine_basket_types to anon;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;
