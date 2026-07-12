-- ============================================================================
-- 0004 — Inscription : création du profil
-- ============================================================================
-- Toute la logique d'inscription vit en base (trigger sur auth.users) afin
-- qu'aucun chemin d'inscription (app, admin, script) ne puisse créer un
-- compte incohérent.

-- ----------------------------------------------------------------------------
-- Création du profil à l'inscription. Les métadonnées attendues dans
-- auth.users.raw_user_meta_data : first_name, last_name,
-- date_of_birth (YYYY-MM-DD), city, phone_number.
-- ----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.profiles (
    id, first_name, last_name, email, date_of_birth, city, phone_number, email_verified_at
  ) values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'date_of_birth')::date, current_date - interval '18 years'),
    coalesce(new.raw_user_meta_data ->> 'city', ''),
    coalesce(new.raw_user_meta_data ->> 'phone_number', ''),
    new.email_confirmed_at
  );

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
