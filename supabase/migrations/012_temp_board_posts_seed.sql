-- ============================================================
-- 교회소식 / 교회앨범 임시 게시글 1건씩
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

INSERT INTO public.board_posts (
  id,
  post_type,
  title,
  content,
  writer,
  images,
  thumbnail
)
VALUES
  (
    'a0000001-0000-4000-8000-000000000001',
    'church_news',
    '[임시] 교회소식 안내',
    '임시 게시글입니다. 추후 실제 교회소식 내용으로 업데이트됩니다.' || E'\n\n' ||
    '주일 예배와 교회 행사 소식을 이곳에서 안내할 예정입니다.',
    '관리자',
    '[]'::jsonb,
    NULL
  ),
  (
    'a0000001-0000-4000-8000-000000000002',
    'album',
    '[임시] 교회앨범 안내',
    '임시 게시글입니다. 추후 실제 앨범 사진과 내용으로 업데이트됩니다.' || E'\n\n' ||
    '교회 행사와 봉사 활동 사진을 이곳에서 소개할 예정입니다.',
    '관리자',
    '[]'::jsonb,
    NULL
  )
ON CONFLICT (id) DO UPDATE
SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  writer = EXCLUDED.writer,
  images = EXCLUDED.images,
  thumbnail = EXCLUDED.thumbnail,
  updated_at = now();

SELECT public.ensure_board_post_meta('church_news', 'a0000001-0000-4000-8000-000000000001');
SELECT public.ensure_board_post_meta('album', 'a0000001-0000-4000-8000-000000000002');

UPDATE public.board_post_meta
SET views_count = 12
WHERE post_id IN (
  'a0000001-0000-4000-8000-000000000001',
  'a0000001-0000-4000-8000-000000000002'
);
