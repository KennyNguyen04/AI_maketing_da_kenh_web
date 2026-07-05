-- Phase 0.3 TEST 2 (REVISED): CHECK constraints verification
-- Original filter was too narrow; let's dump every constraint text directly.

-- 2a. All constraints on extension_tasks
SELECT conname, pg_get_constraintdef(oid) AS check_definition
FROM pg_constraint
WHERE conrelid = 'public.extension_tasks'::regclass
  AND contype = 'c'
ORDER BY conname;

-- 2b. All constraints on drafts
SELECT conname, pg_get_constraintdef(oid) AS check_definition
FROM pg_constraint
WHERE conrelid = 'public.drafts'::regclass
  AND contype = 'c'
ORDER BY conname;

-- 2c. All constraints on repurpose_jobs (sanity check)
SELECT conname, pg_get_constraintdef(oid) AS check_definition
FROM pg_constraint
WHERE conrelid = 'public.repurpose_jobs'::regclass
  AND contype = 'c'
ORDER BY conname;

-- 2d. Unique constraints on drafts (so we know which keys to dodge in seed data)
SELECT conname, pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.drafts'::regclass
  AND contype = 'u'
ORDER BY conname;

-- 2e. Check: is there a UNIQUE(job_id, channel) constraint where is_current=true?
-- If yes, only one current draft per (job, channel). If only (job, channel, version),
-- multiple versions allowed; old drafts should have is_current=false.