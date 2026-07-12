-- ============================================================================
-- 0004 — Inscription : génération du profil, du code promo et du 1er cycle
-- ============================================================================
-- Toute la logique d'inscription vit en base (trigger sur auth.users) afin
-- qu'aucun chemin d'inscription (app, admin, script) ne puisse créer un
-- compte incohérent (sans code promo, sans portefeuille, sans cycle initial).

-- ----------------------------------------------------------------------------
-- Génération d'un code promo unique (8 caractères, alphabet sans caractères
-- ambigus : pas de 0/O ni 1/I).
-- ----------------------------------------------------------------------------
create function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
  exists_already boolean;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    select exists(select 1 from public.profiles where referral_code = candidate) into exists_already;
    exit when not exists_already;
  end loop;

  return candidate;
end;
$$;

-- ----------------------------------------------------------------------------
-- Création du profil + portefeuille + 1er cycle de mission à l'inscription.
-- Les métadonnées attendues dans auth.users.raw_user_meta_data :
--   first_name, last_name, date_of_birth (YYYY-MM-DD), city, phone_number,
--   referral_code_input (optionnel, code du parrain saisi à l'inscription).
-- ----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_referrer_id uuid;
  v_new_code text;
  v_cycle_id uuid;
begin
  v_new_code := public.generate_referral_code();

  if (new.raw_user_meta_data ->> 'referral_code_input') is not null
     and btrim(new.raw_user_meta_data ->> 'referral_code_input') <> '' then
    select id into v_referrer_id
    from public.profiles
    where referral_code = upper(btrim(new.raw_user_meta_data ->> 'referral_code_input'));
  end if;

  insert into public.profiles (
    id, first_name, last_name, email, date_of_birth, city, phone_number,
    referral_code, referred_by, email_verified_at
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'date_of_birth')::date, current_date - interval '18 years'),
    coalesce(new.raw_user_meta_data ->> 'city', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_number', ''),
    v_new_code,
    v_referrer_id,
    new.email_confirmed_at
  );

  insert into public.wallets (user_id) values (new.id);

  -- fn_start_new_cycle est définie plus loin (0007) ; résolue au moment de
  -- l'exécution (post-migrations), pas à la création de cette fonction.
  v_cycle_id := public.fn_start_new_cycle(new.id, 1::smallint);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Synchronisation de la vérification d'e-mail (auth.users -> profiles).
-- ----------------------------------------------------------------------------
create function public.handle_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set email_verified_at = new.email_confirmed_at where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_email_confirmation();
