-- 046_add_news_category_code.sql
-- Migration: Add category_code to public.news table

ALTER TABLE public.news ADD COLUMN IF NOT EXISTS category_code text NULL;

ALTER TABLE public.news DROP CONSTRAINT IF EXISTS news_category_code_check;

ALTER TABLE public.news ADD CONSTRAINT news_category_code_check 
  CHECK (category_code IN ('LEARNING', 'TRAINING', 'EVENT', 'ROLE_MODEL'));
