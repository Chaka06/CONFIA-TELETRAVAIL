-- ============================================================================
-- 0010 — Catégories de missions (contenu de démarrage)
-- ============================================================================
-- Une ligne par générateur (0007). Chaque génération produit un contenu
-- réellement affiché à l'utilisateur (texte de référence, éléments à
-- classer, options...) et une réponse correcte connue du serveur, ce qui
-- permet une correction automatique fiable, sans intervention humaine.

insert into public.mission_templates (category, title, description, generator_key, estimated_duration_seconds) values
(
  'redaction',
  'Rédaction encadrée',
  'Rédiger un texte court contenant des mots-clés imposés.',
  'redaction_contrainte',
  240
),
(
  'verification',
  'Vérification d''une information',
  'Lire une fiche factuelle générée et juger une affirmation vraie ou fausse.',
  'verification_info',
  150
),
(
  'classification',
  'Classification de données',
  'Ranger des éléments réellement listés dans l''une de deux catégories.',
  'classification',
  200
),
(
  'validation_contenu',
  'Validation de contenu',
  'Repérer, dans une liste affichée, l''élément qui ne correspond pas à la catégorie annoncée.',
  'validation_contenu',
  150
),
(
  'analyse_texte',
  'Analyse de texte',
  'Lire un court paragraphe généré et en extraire une information précise.',
  'analyse_texte',
  150
),
(
  'questionnaire',
  'Questionnaire',
  'Répondre à une question à choix multiple.',
  'questionnaire',
  90
),
(
  'test_logique',
  'Test rapide de calcul',
  'Résoudre un calcul simple.',
  'test_logique',
  60
);
