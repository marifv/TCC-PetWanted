BEGIN;

ALTER TABLE animais
    ADD COLUMN IF NOT EXISTS fotos JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE animais
SET fotos = jsonb_build_array(foto)
WHERE foto IS NOT NULL
  AND fotos = '[]'::jsonb;

COMMIT;