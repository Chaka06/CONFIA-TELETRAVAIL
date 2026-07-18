-- ============================================================================
-- 0016 — Corrige un vrai bug : les visiteurs non connectés voyaient
-- toujours "0/20 membres" sur /paniers
-- ============================================================================
-- Trouvé en préparant l'intégration Telegram (une commande de bot devait
-- lire le même remplissage de paniers) : basket_instances_select_authenticated
-- (migration 0007) limitait la lecture de tontine_basket_instances au rôle
-- `authenticated` — alors que /paniers (page publique, marketing) l'affiche
-- à TOUT visiteur, y compris non connecté. Pour un visiteur anonyme, RLS
-- bloquait donc silencieusement la lecture des instances : le compteur de
-- membres retombait à 0 pour chaque panier, même quand de vrais paiements
-- avaient déjà eu lieu — sur la page dont le rôle est justement de donner
-- envie de rejoindre.
--
-- Aucune colonne sensible sur cette table (juste des compteurs et un
-- statut, aucune donnée utilisateur) : sans risque de l'ouvrir à `anon`,
-- exactement comme tontine_basket_types (basket_types_select_all) l'est
-- déjà.

drop policy if exists basket_instances_select_authenticated on public.tontine_basket_instances;
create policy basket_instances_select_all on public.tontine_basket_instances for select using (true);
