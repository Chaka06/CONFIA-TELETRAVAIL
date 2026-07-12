-- ============================================================================
-- 0009 — Row Level Security
-- ============================================================================
-- Principe : un utilisateur authentifié ne peut lire/écrire que ses propres
-- données. Les administrateurs (role admin/super_admin) ont un accès en
-- lecture étendu. Toute écriture financière transite par les fonctions RPC
-- SECURITY DEFINER (0005-0008), jamais par une écriture directe de table —
-- les policies ci-dessous sont donc volontairement en lecture seule (ou très
-- restreintes) pour le rôle `authenticated`.

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_update on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Défense en profondeur : même via la policy "update own", un utilisateur
-- standard ne peut jamais modifier son rôle, son statut, son code promo ou
-- son parrain. Seul un contexte admin/service_role peut le faire.
create function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) = 'service_role' or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.referral_code is distinct from old.referral_code
     or new.referred_by is distinct from old.referred_by
     or new.email is distinct from old.email then
    raise exception 'forbidden_field_change';
  end if;

  return new;
end;
$$;

create trigger profiles_guard_privileged_fields
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

-- ----------------------------------------------------------------------------
-- wallets — lecture seule pour les utilisateurs, toute écriture passe par
-- fn_apply_wallet_delta (SECURITY DEFINER, propriétaire de la table).
-- ----------------------------------------------------------------------------
alter table public.wallets enable row level security;

create policy wallets_select_own_or_admin on public.wallets
  for select using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- platform_settings & tier_definitions — lecture PUBLIQUE (y compris visiteurs
-- non connectés) : ces paramètres décrivent les règles métier (montants de
-- palier, seuils de retrait) que la page d'accueil doit expliquer sans
-- ambiguïté avant même l'inscription. Écriture réservée au super_admin.
-- ----------------------------------------------------------------------------
alter table public.platform_settings enable row level security;

create policy platform_settings_select_public on public.platform_settings
  for select using (true);

create policy platform_settings_write_super_admin on public.platform_settings
  for all using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.tier_definitions enable row level security;

create policy tier_definitions_select_public on public.tier_definitions
  for select using (true);

create policy tier_definitions_write_super_admin on public.tier_definitions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- mission_cycles / cycle_tiers
-- ----------------------------------------------------------------------------
alter table public.mission_cycles enable row level security;

create policy mission_cycles_select_own_or_admin on public.mission_cycles
  for select using (user_id = auth.uid() or public.is_admin());

alter table public.cycle_tiers enable row level security;

create policy cycle_tiers_select_own_or_admin on public.cycle_tiers
  for select using (
    exists (select 1 from public.mission_cycles mc where mc.id = cycle_id and mc.user_id = auth.uid())
    or public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- deposits
-- ----------------------------------------------------------------------------
alter table public.deposits enable row level security;

create policy deposits_select_own_or_admin on public.deposits
  for select using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- mission_templates — contenu interne, jamais exposé directement au client
-- (l'utilisateur consulte le contenu déjà généré via mission_assignments).
-- ----------------------------------------------------------------------------
alter table public.mission_templates enable row level security;

create policy mission_templates_admin_only on public.mission_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- mission_assignments
-- ----------------------------------------------------------------------------
alter table public.mission_assignments enable row level security;

create policy mission_assignments_select_own_or_admin on public.mission_assignments
  for select using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- withdrawal_rights
-- ----------------------------------------------------------------------------
alter table public.withdrawal_rights enable row level security;

create policy withdrawal_rights_select_own_or_admin on public.withdrawal_rights
  for select using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- withdrawals
-- ----------------------------------------------------------------------------
alter table public.withdrawals enable row level security;

create policy withdrawals_select_own_or_admin on public.withdrawals
  for select using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- referral_commissions — visible par le parrain (bénéficiaire) et l'admin.
-- ----------------------------------------------------------------------------
alter table public.referral_commissions enable row level security;

create policy referral_commissions_select_referrer_or_admin on public.referral_commissions
  for select using (referrer_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- transactions — grand livre, lecture seule.
-- ----------------------------------------------------------------------------
alter table public.transactions enable row level security;

create policy transactions_select_own_or_admin on public.transactions
  for select using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- notifications — l'utilisateur peut marquer ses propres notifications comme
-- lues (colonne read_at uniquement, garanti par trigger).
-- ----------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy notifications_select_own_or_admin on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.guard_notification_fields()
returns trigger
language plpgsql
as $$
begin
  if current_setting('role', true) = 'service_role' or public.is_admin() then
    return new;
  end if;

  if new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.metadata is distinct from old.metadata
     or new.user_id is distinct from old.user_id then
    raise exception 'forbidden_field_change';
  end if;

  return new;
end;
$$;

create trigger notifications_guard_fields
  before update on public.notifications
  for each row execute function public.guard_notification_fields();

-- ----------------------------------------------------------------------------
-- audit_logs & email_logs — administration uniquement.
-- ----------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy audit_logs_admin_only on public.audit_logs
  for select using (public.is_admin());

alter table public.email_logs enable row level security;

create policy email_logs_admin_only on public.email_logs
  for select using (public.is_admin());
