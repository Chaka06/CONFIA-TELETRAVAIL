-- ============================================================================
-- 0007 — Moteur des missions & progression des paliers
-- ============================================================================
-- Contient : génération de missions à réponse objective (7 catégories, une
-- fonction génératrice par catégorie), correction automatique instantanée à
-- la soumission (aucune revue humaine), puis la cascade métier complète
-- (récompense, avancement de palier, complétion de cycle, droit de retrait,
-- commissions de parrainage). Aucune fonction de ce fichier ne dépend d'une
-- action d'administrateur : la seule action manuelle de la plateforme est le
-- traitement des retraits (0008).

-- ----------------------------------------------------------------------------
-- Démarrage d'un cycle (le 1er est créé à l'inscription, les suivants sont
-- démarrés automatiquement dès qu'un cycle précédent est complété).
-- ----------------------------------------------------------------------------
create function public.fn_start_new_cycle(p_user_id uuid, p_cycle_number smallint)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cycle_id uuid;
  v_tier record;
begin
  insert into public.mission_cycles (user_id, cycle_number, status, current_tier)
  values (p_user_id, p_cycle_number, 'in_progress', 1)
  returning id into v_cycle_id;

  for v_tier in select tier_number from public.tier_definitions order by tier_number loop
    insert into public.cycle_tiers (cycle_id, tier_number, status, unlocked_at)
    values (
      v_cycle_id,
      v_tier.tier_number,
      case when v_tier.tier_number = 1 then 'awaiting_deposit'::tier_status else 'locked'::tier_status end,
      case when v_tier.tier_number = 1 then now() else null end
    );
  end loop;

  return v_cycle_id;
end;
$$;

revoke all on function public.fn_start_new_cycle from public, anon, authenticated;
grant execute on function public.fn_start_new_cycle to service_role;

-- ============================================================================
-- Générateurs de missions — un par catégorie.
-- Chacun renvoie {"content": {...} (affiché au client), "expected_answer":
-- {...} (jamais transmis, cf. privilège colonne en 0011)}. Le contenu réel
-- (texte de référence, éléments à classer, options...) est TOUJOURS inclus
-- dans "content" : aucune mission ne doit demander de traiter des données
-- qui ne sont pas explicitement montrées à l'utilisateur.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Rédaction encadrée : un texte court contenant obligatoirement 3
-- mots-clés imposés, dans une plage de longueur donnée.
-- ----------------------------------------------------------------------------
create function public.fn_generate_redaction_contrainte()
returns jsonb
language plpgsql
as $$
declare
  v_keywords text[] := array[
    'livraison','facture','rendez-vous','budget','équipe','délai','client',
    'rapport','réunion','objectif','qualité','fournisseur','contrat','formation','processus'
  ];
  v_contexts text[] := array[
    'un e-mail professionnel adressé à un client',
    'une note interne destinée à votre équipe',
    'la description d''un produit pour un catalogue en ligne',
    'un message de suivi après une réunion de travail'
  ];
  v_selected text[];
  v_context text;
  v_min int := 15;
  v_max int := 40;
begin
  select array_agg(k) into v_selected
  from (select k from unnest(v_keywords) as k order by random() limit 3) s;

  v_context := v_contexts[1 + floor(random() * array_length(v_contexts, 1))::int];

  return jsonb_build_object(
    'content', jsonb_build_object(
      'category', 'redaction_contrainte',
      'title', 'Rédaction encadrée',
      'instructions', format(
        'Rédigez %s (entre %s et %s mots) contenant obligatoirement les mots suivants : %s.',
        v_context, v_min, v_max, array_to_string(v_selected, ', ')
      ),
      'keywords', to_jsonb(v_selected),
      'min_words', v_min,
      'max_words', v_max,
      'answer_type', 'text'
    ),
    'expected_answer', jsonb_build_object('keywords', to_jsonb(v_selected), 'min_words', v_min, 'max_words', v_max)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Vérification d'information : une courte fiche factuelle générée est
-- montrée à l'utilisateur, puis une affirmation vraie ou fausse à son sujet.
-- ----------------------------------------------------------------------------
create function public.fn_generate_verification_info()
returns jsonb
language plpgsql
as $$
declare
  v_noms text[] := array['Les Ateliers Solidaires','Cercle Horizon','Association Racines','Collectif Nouvel Élan','Fédération Entraide','Réseau Cap Avenir'];
  v_villes text[] := array['Abidjan','Dakar','Cotonou','Lomé','Ouagadougou','Bamako'];
  v_frequences text[] := array['chaque mois','chaque trimestre','chaque année'];
  v_nom text;
  v_ville text;
  v_annee int;
  v_nombre int;
  v_frequence text;
  v_is_true boolean := random() < 0.5;
  v_claim_subject text := case when random() < 0.5 then 'annee' else 'nombre' end;
  v_claim text;
  v_reference text;
begin
  v_nom := v_noms[1 + floor(random() * array_length(v_noms, 1))::int];
  v_ville := v_villes[1 + floor(random() * array_length(v_villes, 1))::int];
  v_annee := 1995 + floor(random() * 26)::int;
  v_nombre := 20 + floor(random() * 480)::int;
  v_frequence := v_frequences[1 + floor(random() * array_length(v_frequences, 1))::int];

  v_reference := format(
    'L''association « %s » a été créée en %s à %s. Elle compte aujourd''hui %s membres actifs et organise %s un événement public.',
    v_nom, v_annee, v_ville, v_nombre, v_frequence
  );

  if v_claim_subject = 'annee' then
    v_claim := format(
      'L''association « %s » a été créée en %s.',
      v_nom, case when v_is_true then v_annee else v_annee + 3 + floor(random() * 5)::int end
    );
  else
    v_claim := format(
      'L''association « %s » compte %s membres actifs.',
      v_nom, case when v_is_true then v_nombre else v_nombre + 50 + floor(random() * 150)::int end
    );
  end if;

  return jsonb_build_object(
    'content', jsonb_build_object(
      'category', 'verification_info',
      'title', 'Vérification d''une information',
      'instructions', 'Lisez le texte de référence puis indiquez si l''affirmation qui suit est vraie ou fausse.',
      'reference_text', v_reference,
      'claim', v_claim,
      'answer_type', 'boolean'
    ),
    'expected_answer', jsonb_build_object('answer', v_is_true)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Classification : des éléments réellement listés à ranger dans l'une de
-- deux catégories nommées.
-- ----------------------------------------------------------------------------
create function public.fn_generate_classification()
returns jsonb
language plpgsql
as $$
declare
  v_set_index int := 1 + floor(random() * 3)::int;
  v_cat_a text;
  v_cat_b text;
  v_items_a text[];
  v_items_b text[];
  v_picked_a text[];
  v_picked_b text[];
  v_items jsonb := '[]'::jsonb;
  v_answers jsonb := '{}'::jsonb;
  v_order int[];
  v_idx int;
  v_item text;
  v_category text;
  v_position int := 0;
begin
  if v_set_index = 1 then
    v_cat_a := 'Fruits';
    v_cat_b := 'Légumes';
    v_items_a := array['pomme','banane','orange','fraise','mangue','ananas','raisin','poire'];
    v_items_b := array['carotte','poireau','courgette','épinard','brocoli','aubergine','radis','oignon'];
  elsif v_set_index = 2 then
    v_cat_a := 'Métiers de la santé';
    v_cat_b := 'Métiers du numérique';
    v_items_a := array['infirmier','pharmacien','kinésithérapeute','sage-femme','dentiste','chirurgien'];
    v_items_b := array['développeur','designer UX','administrateur réseau','data analyst','chef de produit','testeur logiciel'];
  else
    v_cat_a := 'Transports terrestres';
    v_cat_b := 'Transports maritimes';
    v_items_a := array['voiture','vélo','train','bus','moto','tramway'];
    v_items_b := array['voilier','cargo','ferry','paquebot','kayak','chalutier'];
  end if;

  select array_agg(x) into v_picked_a from (select x from unnest(v_items_a) as x order by random() limit 3) s;
  select array_agg(x) into v_picked_b from (select x from unnest(v_items_b) as x order by random() limit 3) s;

  for v_idx in 1..3 loop
    v_items := v_items || jsonb_build_array(v_picked_a[v_idx]);
    v_answers := v_answers || jsonb_build_object((v_position)::text, v_cat_a);
    v_position := v_position + 1;
  end loop;
  for v_idx in 1..3 loop
    v_items := v_items || jsonb_build_array(v_picked_b[v_idx]);
    v_answers := v_answers || jsonb_build_object((v_position)::text, v_cat_b);
    v_position := v_position + 1;
  end loop;

  -- Mélange l'ordre d'affichage des 6 éléments tout en conservant la bonne
  -- correspondance élément -> catégorie dans expected_answer.
  select array_agg(ord) into v_order from (select ord from generate_series(0, 5) as ord order by random()) s;

  declare
    v_shuffled_items jsonb := '[]'::jsonb;
    v_shuffled_answers jsonb := '{}'::jsonb;
    v_new_pos int := 0;
  begin
    foreach v_idx in array v_order loop
      v_shuffled_items := v_shuffled_items || jsonb_build_array(v_items -> v_idx);
      v_shuffled_answers := v_shuffled_answers || jsonb_build_object((v_new_pos)::text, v_answers ->> v_idx::text);
      v_new_pos := v_new_pos + 1;
    end loop;

    return jsonb_build_object(
      'content', jsonb_build_object(
        'category', 'classification',
        'title', 'Classification de données',
        'instructions', format(
          'Classez chacun des %s éléments suivants dans la catégorie « %s » ou « %s ».',
          jsonb_array_length(v_shuffled_items), v_cat_a, v_cat_b
        ),
        'items', v_shuffled_items,
        'categories', jsonb_build_array(v_cat_a, v_cat_b),
        'answer_type', 'classification'
      ),
      'expected_answer', jsonb_build_object('answers', v_shuffled_answers, 'min_correct_ratio', 0.8)
    );
  end;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Validation de contenu : repérer, dans une liste réellement affichée,
-- l'élément qui ne correspond pas à la catégorie annoncée.
-- ----------------------------------------------------------------------------
create function public.fn_generate_validation_contenu()
returns jsonb
language plpgsql
as $$
declare
  v_set_index int := 1 + floor(random() * 3)::int;
  v_cat_a text;
  v_items_a text[];
  v_items_b text[];
  v_picked text[];
  v_odd_one text;
  v_items jsonb := '[]'::jsonb;
  v_order int[];
  v_idx int;
  v_odd_position int;
  v_shuffled jsonb := '[]'::jsonb;
  v_correct_index int;
  v_pos int := 0;
begin
  if v_set_index = 1 then
    v_cat_a := 'Fruits';
    v_items_a := array['pomme','banane','orange','fraise','mangue','ananas','raisin','poire'];
    v_items_b := array['carotte','poireau','courgette','épinard','brocoli','aubergine'];
  elsif v_set_index = 2 then
    v_cat_a := 'capitales de pays';
    v_items_a := array['Paris','Tokyo','Nairobi','Ottawa','Canberra','Lisbonne'];
    v_items_b := array['Marseille','Osaka','Mombasa','Toronto','Sydney'];
  else
    v_cat_a := 'instruments de musique';
    v_items_a := array['piano','violon','trompette','flûte','guitare','tambour'];
    v_items_b := array['pinceau','ciseaux','marteau','tournevis'];
  end if;

  select array_agg(x) into v_picked from (select x from unnest(v_items_a) as x order by random() limit 5) s;
  v_odd_one := v_items_b[1 + floor(random() * array_length(v_items_b, 1))::int];

  v_items := to_jsonb(v_picked) || jsonb_build_array(v_odd_one);
  v_odd_position := 5; -- dernier élément avant mélange (index 0-based)

  select array_agg(ord) into v_order from (select ord from generate_series(0, 5) as ord order by random()) s;

  foreach v_idx in array v_order loop
    v_shuffled := v_shuffled || jsonb_build_array(v_items -> v_idx);
    if v_idx = v_odd_position then
      v_correct_index := v_pos;
    end if;
    v_pos := v_pos + 1;
  end loop;

  return jsonb_build_object(
    'content', jsonb_build_object(
      'category', 'validation_contenu',
      'title', 'Validation de contenu',
      'instructions', format('Parmi les %s éléments suivants, indiquez celui qui n''appartient PAS à la catégorie « %s ».', jsonb_array_length(v_shuffled), v_cat_a),
      'items', v_shuffled,
      'answer_type', 'anomaly_pick'
    ),
    'expected_answer', jsonb_build_object('correct_index', v_correct_index)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Analyse de texte : un court paragraphe généré, une question dont la
-- réponse (un chiffre) figure explicitement dans ce paragraphe.
-- ----------------------------------------------------------------------------
create function public.fn_generate_analyse_texte()
returns jsonb
language plpgsql
as $$
declare
  v_entreprises text[] := array['Atlas Distribution','NovaTech Services','Comptoir du Sud','Delta Logistique','Prima Conseil'];
  v_entreprise text;
  v_demandes int;
  v_pourcentage int;
  v_delai int;
  v_reference text;
  v_subject text := (array['demandes','pourcentage','delai'])[1 + floor(random() * 3)::int];
  v_question text;
  v_answer text;
begin
  v_entreprise := v_entreprises[1 + floor(random() * array_length(v_entreprises, 1))::int];
  v_demandes := 80 + floor(random() * 400)::int;
  v_pourcentage := 3 + floor(random() * 25)::int;
  v_delai := 2 + floor(random() * 22)::int;

  v_reference := format(
    'Le service client de %s a traité %s demandes la semaine dernière, soit une hausse de %s %% par rapport à la semaine précédente. Le délai moyen de réponse est désormais de %s heures.',
    v_entreprise, v_demandes, v_pourcentage, v_delai
  );

  if v_subject = 'demandes' then
    v_question := 'D''après le texte, combien de demandes ont été traitées la semaine dernière ?';
    v_answer := v_demandes::text;
  elsif v_subject = 'pourcentage' then
    v_question := 'D''après le texte, quel est le pourcentage de hausse mentionné ?';
    v_answer := v_pourcentage::text;
  else
    v_question := 'D''après le texte, quel est le délai moyen de réponse mentionné (en heures) ?';
    v_answer := v_delai::text;
  end if;

  return jsonb_build_object(
    'content', jsonb_build_object(
      'category', 'analyse_texte',
      'title', 'Analyse de texte',
      'instructions', 'Lisez le texte suivant puis répondez à la question posée par un nombre.',
      'reference_text', v_reference,
      'question', v_question,
      'answer_type', 'text_short'
    ),
    'expected_answer', jsonb_build_object('answer', v_answer)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Questionnaire à choix multiple : une question fixe parmi une banque,
-- avec 4 options et une seule bonne réponse.
-- ----------------------------------------------------------------------------
create function public.fn_generate_questionnaire()
returns jsonb
language plpgsql
as $$
declare
  v_questions jsonb := jsonb_build_array(
    jsonb_build_object('q', 'Quel mot est un synonyme de « rapide » ?', 'options', jsonb_build_array('Lent', 'Prompt', 'Fragile', 'Lourd'), 'correct', 1),
    jsonb_build_object('q', 'Combien y a-t-il de jours en février lors d''une année bissextile ?', 'options', jsonb_build_array('28', '29', '30', '31'), 'correct', 1),
    jsonb_build_object('q', 'Quel est l''antonyme de « augmenter » ?', 'options', jsonb_build_array('Croître', 'Diminuer', 'Stabiliser', 'Multiplier'), 'correct', 1),
    jsonb_build_object('q', 'Laquelle de ces unités mesure une durée ?', 'options', jsonb_build_array('Kilogramme', 'Litre', 'Heure', 'Mètre'), 'correct', 2),
    jsonb_build_object('q', 'Quel jour vient juste après mercredi ?', 'options', jsonb_build_array('Lundi', 'Mardi', 'Jeudi', 'Vendredi'), 'correct', 2),
    jsonb_build_object('q', 'Quel terme désigne un document résumant une activité professionnelle ?', 'options', jsonb_build_array('Facture', 'Rapport', 'Devis', 'Contrat'), 'correct', 1)
  );
  v_picked jsonb;
begin
  v_picked := v_questions -> floor(random() * jsonb_array_length(v_questions))::int;

  return jsonb_build_object(
    'content', jsonb_build_object(
      'category', 'questionnaire',
      'title', 'Questionnaire',
      'instructions', 'Choisissez la bonne réponse parmi les propositions suivantes.',
      'question', v_picked ->> 'q',
      'options', v_picked -> 'options',
      'answer_type', 'mcq'
    ),
    'expected_answer', jsonb_build_object('correct_index', (v_picked ->> 'correct')::int)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. Test simple : calcul mental rapide.
-- ----------------------------------------------------------------------------
create function public.fn_generate_test_logique()
returns jsonb
language plpgsql
as $$
declare
  v_operation text := (array['addition','soustraction','multiplication'])[1 + floor(random() * 3)::int];
  v_a int;
  v_b int;
  v_result int;
  v_question text;
begin
  if v_operation = 'addition' then
    v_a := 10 + floor(random() * 80)::int;
    v_b := 10 + floor(random() * 80)::int;
    v_result := v_a + v_b;
    v_question := format('Combien font %s + %s ?', v_a, v_b);
  elsif v_operation = 'soustraction' then
    v_a := 50 + floor(random() * 50)::int;
    v_b := 5 + floor(random() * 45)::int;
    v_result := v_a - v_b;
    v_question := format('Combien font %s - %s ?', v_a, v_b);
  else
    v_a := 2 + floor(random() * 11)::int;
    v_b := 2 + floor(random() * 11)::int;
    v_result := v_a * v_b;
    v_question := format('Combien font %s x %s ?', v_a, v_b);
  end if;

  return jsonb_build_object(
    'content', jsonb_build_object(
      'category', 'test_logique',
      'title', 'Test rapide de calcul',
      'instructions', 'Répondez par un nombre entier.',
      'question', v_question,
      'answer_type', 'numeric'
    ),
    'expected_answer', jsonb_build_object('answer', v_result)
  );
end;
$$;

revoke all on function
  public.fn_generate_redaction_contrainte,
  public.fn_generate_verification_info,
  public.fn_generate_classification,
  public.fn_generate_validation_contenu,
  public.fn_generate_analyse_texte,
  public.fn_generate_questionnaire,
  public.fn_generate_test_logique
from public, anon, authenticated;
grant execute on function
  public.fn_generate_redaction_contrainte,
  public.fn_generate_verification_info,
  public.fn_generate_classification,
  public.fn_generate_validation_contenu,
  public.fn_generate_analyse_texte,
  public.fn_generate_questionnaire,
  public.fn_generate_test_logique
to service_role;

-- ----------------------------------------------------------------------------
-- Génère (ou régénère après échec) une mission pour un emplacement précis,
-- en répartissant les 7 catégories selon generator_key.
-- ----------------------------------------------------------------------------
create function public.fn_generate_one_mission(p_cycle_tier_id uuid, p_slot_number smallint)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tier public.cycle_tiers%rowtype;
  v_cycle public.mission_cycles%rowtype;
  v_reward numeric(14, 2);
  v_template public.mission_templates%rowtype;
  v_generated jsonb;
  v_content jsonb;
  v_answer jsonb;
  v_seed text;
  v_attempt int := 0;
  v_inserted boolean := false;
begin
  select * into v_tier from public.cycle_tiers where id = p_cycle_tier_id;
  select * into v_cycle from public.mission_cycles where id = v_tier.cycle_id;
  select mission_reward_amount into v_reward from public.tier_definitions where tier_number = v_tier.tier_number;

  select * into v_template
  from public.mission_templates
  where is_active = true
    and id not in (
      select template_id from public.mission_assignments
      where cycle_id = v_tier.cycle_id and tier_number = v_tier.tier_number
        and status not in ('rejected', 'expired')
    )
  order by random()
  limit 1;

  if not found then
    select * into v_template from public.mission_templates where is_active = true order by random() limit 1;
  end if;

  if not found then
    raise exception 'no_active_mission_templates';
  end if;

  while not v_inserted and v_attempt < 5 loop
    v_attempt := v_attempt + 1;
    v_seed := encode(gen_random_bytes(8), 'hex');

    v_generated := case v_template.generator_key
      when 'redaction_contrainte' then public.fn_generate_redaction_contrainte()
      when 'verification_info' then public.fn_generate_verification_info()
      when 'classification' then public.fn_generate_classification()
      when 'validation_contenu' then public.fn_generate_validation_contenu()
      when 'analyse_texte' then public.fn_generate_analyse_texte()
      when 'questionnaire' then public.fn_generate_questionnaire()
      when 'test_logique' then public.fn_generate_test_logique()
      else null
    end;

    if v_generated is null then
      raise exception 'unknown_generator_key: %', v_template.generator_key;
    end if;

    v_content := jsonb_set(v_generated -> 'content', '{instance_id}', to_jsonb(gen_random_uuid()::text));
    v_answer := v_generated -> 'expected_answer';

    begin
      insert into public.mission_assignments (
        user_id, cycle_id, tier_number, slot_number, template_id, variant_seed,
        variant_content, expected_answer, reward_amount, status
      ) values (
        v_cycle.user_id, v_tier.cycle_id, v_tier.tier_number, p_slot_number, v_template.id, v_seed,
        v_content, v_answer, v_reward, 'assigned'
      );
      v_inserted := true;
    exception when unique_violation then
      v_inserted := false;
    end;
  end loop;

  if not v_inserted then
    raise exception 'mission_generation_failed_after_retries for tier %, slot %', v_tier.tier_number, p_slot_number;
  end if;
end;
$$;

revoke all on function public.fn_generate_one_mission from public, anon, authenticated;
grant execute on function public.fn_generate_one_mission to service_role;

create function public.fn_generate_tier_missions(p_cycle_tier_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_missions_count smallint;
  v_tier_number smallint;
  v_slot smallint;
begin
  select tier_number into v_tier_number from public.cycle_tiers where id = p_cycle_tier_id;
  select missions_per_tier into v_missions_count from public.tier_definitions where tier_number = v_tier_number;

  for v_slot in 1..v_missions_count loop
    perform public.fn_generate_one_mission(p_cycle_tier_id, v_slot::smallint);
  end loop;
end;
$$;

revoke all on function public.fn_generate_tier_missions from public, anon, authenticated;
grant execute on function public.fn_generate_tier_missions to service_role;

-- ============================================================================
-- Correction automatique — une fonction de grading par catégorie.
-- ============================================================================
create function public.fn_grade_redaction_contrainte(p_expected jsonb, p_submission jsonb)
returns boolean
language plpgsql
as $$
declare
  v_text text := coalesce(p_submission ->> 'answer', '');
  v_normalized text;
  v_words text[];
  v_word_count int;
  v_keyword text;
  v_min int := (p_expected ->> 'min_words')::int;
  v_max int := (p_expected ->> 'max_words')::int;
  v_unique_ratio numeric;
begin
  v_normalized := btrim(regexp_replace(v_text, '\s+', ' ', 'g'));
  if v_normalized = '' then
    return false;
  end if;

  v_words := regexp_split_to_array(v_normalized, ' ');
  v_word_count := array_length(v_words, 1);

  if v_word_count is null or v_word_count < v_min or v_word_count > v_max then
    return false;
  end if;

  for v_keyword in select jsonb_array_elements_text(p_expected -> 'keywords') loop
    if position(lower(v_keyword) in lower(v_text)) = 0 then
      return false;
    end if;
  end loop;

  select count(distinct lower(w))::numeric / greatest(array_length(v_words, 1), 1)
  into v_unique_ratio
  from unnest(v_words) as w;

  if v_unique_ratio < 0.4 then
    return false;
  end if;

  return true;
end;
$$;

create function public.fn_grade_classification(p_expected jsonb, p_submission jsonb)
returns boolean
language plpgsql
as $$
declare
  v_key text;
  v_total int := 0;
  v_correct int := 0;
  v_min_ratio numeric := coalesce((p_expected ->> 'min_correct_ratio')::numeric, 0.8);
begin
  for v_key in select jsonb_object_keys(p_expected -> 'answers') loop
    v_total := v_total + 1;
    if (p_submission -> 'answers' ->> v_key) = (p_expected -> 'answers' ->> v_key) then
      v_correct := v_correct + 1;
    end if;
  end loop;

  if v_total = 0 then
    return false;
  end if;

  return (v_correct::numeric / v_total) >= v_min_ratio;
end;
$$;

-- ----------------------------------------------------------------------------
-- Soumission d'une mission par l'utilisateur authentifié — corrigée et
-- finalisée immédiatement, sans intervention humaine.
-- ----------------------------------------------------------------------------
create function public.submit_mission_assignment(p_assignment_id uuid, p_submission_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := auth.uid();
  v_assignment public.mission_assignments%rowtype;
  v_category text;
  v_approved boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_assignment
  from public.mission_assignments
  where id = p_assignment_id and user_id = v_uid
  for update;

  if not found then
    raise exception 'assignment_not_found_or_not_owned';
  end if;

  if v_assignment.status <> 'assigned' then
    raise exception 'assignment_not_in_assigned_state (current: %)', v_assignment.status;
  end if;

  update public.mission_assignments
  set submission_data = p_submission_data, submitted_at = now()
  where id = v_assignment.id;

  v_category := v_assignment.variant_content ->> 'category';

  v_approved := case v_category
    when 'redaction_contrainte' then public.fn_grade_redaction_contrainte(v_assignment.expected_answer, p_submission_data)
    when 'verification_info' then (p_submission_data ->> 'answer')::boolean = (v_assignment.expected_answer ->> 'answer')::boolean
    when 'classification' then public.fn_grade_classification(v_assignment.expected_answer, p_submission_data)
    when 'validation_contenu' then (p_submission_data ->> 'selected_index')::int = (v_assignment.expected_answer ->> 'correct_index')::int
    when 'analyse_texte' then lower(btrim(p_submission_data ->> 'answer')) = lower(btrim(v_assignment.expected_answer ->> 'answer'))
    when 'questionnaire' then (p_submission_data ->> 'selected_index')::int = (v_assignment.expected_answer ->> 'correct_index')::int
    when 'test_logique' then (p_submission_data ->> 'answer')::numeric = (v_assignment.expected_answer ->> 'answer')::numeric
    else false
  end;

  perform public.fn_finalize_mission_assignment(p_assignment_id, v_approved);

  return jsonb_build_object(
    'approved', v_approved,
    'message', case
      when v_approved then 'Réponse correcte : mission validée.'
      else 'Réponse incorrecte. Une nouvelle mission vous a été attribuée sur cet emplacement.'
    end
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    -- Une réponse mal formée (ex : texte au lieu d'un nombre) est traitée
    -- comme une réponse incorrecte plutôt que comme une erreur serveur.
    perform public.fn_finalize_mission_assignment(p_assignment_id, false);
    return jsonb_build_object('approved', false, 'message', 'Réponse invalide. Une nouvelle mission vous a été attribuée.');
end;
$$;

revoke all on function public.submit_mission_assignment from public, anon;
grant execute on function public.submit_mission_assignment to authenticated;

-- ----------------------------------------------------------------------------
-- Finalisation (interne) — porte l'ensemble de la cascade métier : récompense,
-- avancement de palier, complétion de cycle, droit de retrait, commissions de
-- parrainage. Appelée uniquement par submit_mission_assignment ci-dessus ;
-- jamais exposée à un rôle client (aucune validation manuelle n'existe).
-- ----------------------------------------------------------------------------
create function public.fn_finalize_mission_assignment(p_assignment_id uuid, p_approved boolean)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_assignment public.mission_assignments%rowtype;
  v_tier public.cycle_tiers%rowtype;
  v_tier_def public.tier_definitions%rowtype;
  v_cycle public.mission_cycles%rowtype;
  v_profile public.profiles%rowtype;
  v_cap_amount numeric(14, 2);
  v_commission_amount numeric(14, 2);
  v_first_cycle_only boolean;
  v_next_cycle_id uuid;
begin
  select * into v_assignment from public.mission_assignments where id = p_assignment_id for update;
  if not found then
    raise exception 'assignment_not_found';
  end if;

  if not p_approved then
    update public.mission_assignments
    set status = 'rejected', validated_at = now()
    where id = v_assignment.id;

    insert into public.notifications (user_id, type, title, body, metadata)
    values (
      v_assignment.user_id,
      'mission_rejected',
      'Mission non validée',
      'Votre réponse était incorrecte. Une nouvelle mission vous a été attribuée sur le même emplacement.',
      jsonb_build_object('assignment_id', v_assignment.id)
    );

    -- Une nouvelle mission remplace immédiatement celle ratée, sur le même emplacement.
    perform public.fn_generate_one_mission(
      (select ct.id from public.cycle_tiers ct where ct.cycle_id = v_assignment.cycle_id and ct.tier_number = v_assignment.tier_number),
      v_assignment.slot_number
    );

    return;
  end if;

  -- ----- Réponse correcte -----
  update public.mission_assignments
  set status = 'validated', validated_at = now()
  where id = v_assignment.id;

  perform public.fn_apply_wallet_delta(
    v_assignment.user_id,
    v_assignment.reward_amount,
    'mission_reward',
    'mission_assignments',
    v_assignment.id,
    format('Récompense mission validée (palier %s)', v_assignment.tier_number),
    jsonb_build_object('cycle_id', v_assignment.cycle_id, 'tier_number', v_assignment.tier_number)
  );

  select * into v_tier from public.cycle_tiers
  where cycle_id = v_assignment.cycle_id and tier_number = v_assignment.tier_number
  for update;

  select * into v_tier_def from public.tier_definitions where tier_number = v_assignment.tier_number;

  update public.cycle_tiers
  set missions_completed_count = missions_completed_count + 1
  where id = v_tier.id
  returning * into v_tier;

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_assignment.user_id,
    'mission_validated',
    'Mission validée',
    format('Votre mission a été validée : %s crédités.', public.fmt_fcfa(v_assignment.reward_amount)),
    jsonb_build_object('assignment_id', v_assignment.id)
  );

  if v_tier.missions_completed_count < v_tier_def.missions_per_tier then
    -- Palier pas encore terminé : rien de plus à faire.
    return;
  end if;

  -- ----- Palier terminé -----
  update public.cycle_tiers set status = 'completed', completed_at = now() where id = v_tier.id;

  select * into v_cycle from public.mission_cycles where id = v_assignment.cycle_id for update;
  select * into v_profile from public.profiles where id = v_assignment.user_id;

  -- Commissions de parrainage (palier 2 et palier 4).
  select (value #>> '{}')::boolean into v_first_cycle_only
  from public.platform_settings where key = 'referral_commission_applies_to_first_cycle_only';

  if v_profile.referred_by is not null and (not coalesce(v_first_cycle_only, true) or v_cycle.cycle_number = 1) then
    if v_assignment.tier_number = 2 then
      select (value #>> '{}')::numeric into v_commission_amount
      from public.platform_settings where key = 'referral_commission_tier_2_amount';

      insert into public.referral_commissions (referrer_id, referee_id, cycle_id, trigger_type, amount)
      values (v_profile.referred_by, v_profile.id, v_cycle.id, 'tier_2_validated', v_commission_amount)
      on conflict (referee_id, trigger_type) do nothing;

      if found then
        perform public.fn_apply_wallet_delta(
          v_profile.referred_by, v_commission_amount, 'referral_commission', 'referral_commissions', v_cycle.id,
          format('Commission de parrainage : palier 2 validé par %s %s', v_profile.first_name, v_profile.last_name)
        );

        insert into public.notifications (user_id, type, title, body, metadata)
        values (
          v_profile.referred_by, 'referral_commission_credited', 'Commission de parrainage créditée',
          format('%s crédités : votre filleul a validé son palier 2.', public.fmt_fcfa(v_commission_amount)),
          jsonb_build_object('referee_id', v_profile.id)
        );
      end if;
    elsif v_assignment.tier_number = 4 then
      select (value #>> '{}')::numeric into v_commission_amount
      from public.platform_settings where key = 'referral_commission_tier_4_amount';

      insert into public.referral_commissions (referrer_id, referee_id, cycle_id, trigger_type, amount)
      values (v_profile.referred_by, v_profile.id, v_cycle.id, 'tier_4_validated', v_commission_amount)
      on conflict (referee_id, trigger_type) do nothing;

      if found then
        perform public.fn_apply_wallet_delta(
          v_profile.referred_by, v_commission_amount, 'referral_commission', 'referral_commissions', v_cycle.id,
          format('Commission de parrainage : palier 4 validé par %s %s', v_profile.first_name, v_profile.last_name)
        );

        insert into public.notifications (user_id, type, title, body, metadata)
        values (
          v_profile.referred_by, 'referral_commission_credited', 'Commission de parrainage créditée',
          format('%s crédités : votre filleul a terminé une mission complète.', public.fmt_fcfa(v_commission_amount)),
          jsonb_build_object('referee_id', v_profile.id)
        );
      end if;
    end if;
  end if;

  if v_assignment.tier_number < 4 then
    update public.cycle_tiers
    set status = 'awaiting_deposit', unlocked_at = now()
    where cycle_id = v_assignment.cycle_id and tier_number = v_assignment.tier_number + 1;

    update public.mission_cycles set current_tier = v_assignment.tier_number + 1 where id = v_cycle.id;

    insert into public.notifications (user_id, type, title, body, metadata)
    values (
      v_assignment.user_id, 'tier_unlocked', 'Nouveau palier débloqué',
      format('Le palier %s est débloqué. Un dépôt est requis pour continuer.', v_assignment.tier_number + 1),
      jsonb_build_object('cycle_id', v_cycle.id, 'tier_number', v_assignment.tier_number + 1)
    );

    return;
  end if;

  -- ----- Palier 4 terminé : cycle (mission complète) terminé -----
  update public.mission_cycles set status = 'completed', completed_at = now() where id = v_cycle.id;

  select (value #>> '{}')::numeric into v_cap_amount
  from public.platform_settings where key = 'withdrawal_right_cap_amount';

  insert into public.withdrawal_rights (user_id, source_cycle_id, cap_amount)
  values (v_assignment.user_id, v_cycle.id, v_cap_amount);

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    v_assignment.user_id, 'cycle_completed', 'Mission complète terminée',
    format('Félicitations, vous avez terminé une mission complète. Un droit de retrait de %s est disponible.', public.fmt_fcfa(v_cap_amount)),
    jsonb_build_object('cycle_id', v_cycle.id)
  );

  -- Un nouveau cycle démarre automatiquement pour permettre d'enchaîner.
  v_next_cycle_id := public.fn_start_new_cycle(v_assignment.user_id, (v_cycle.cycle_number + 1)::smallint);
end;
$$;

revoke all on function public.fn_finalize_mission_assignment from public, anon, authenticated;
grant execute on function public.fn_finalize_mission_assignment to service_role;
