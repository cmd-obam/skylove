-- 추수감사절 미니게임 이벤트 게시글: 참여방법 안내 이미지 2장을 가로 배치
-- 세 번째 이미지(게임 화면)는 기존처럼 단독 행으로 유지

UPDATE public.board_posts
SET content = concat(
  '<p><span style="font-size: 24px;">추수감사절 미니게임 이벤트를 한시적으로 진행합니다.</span></p>',
  '<p><span style="font-size: 24px;">등수에 따라 목사님께서 상품을 제공해주시기로 했으니 많은 참여 부탁드립니다.</span></p>',
  '<p><span style="font-size: 24px;"><strong>기간 : 10월 26일부터 10월 31일까지</strong></span></p>',
  '<p></p>',
  '<p><span style="font-size: 24px;"><strong>참여방법</strong></span></p>',
  '<div class="board-image-row">',
  '<img src="https://nwsytxwurnaxaabztomh.supabase.co/storage/v1/object/public/board-uploads/board-images/church_news/d6aec802-50d2-469a-87e1-a47ab6209604/1791867502947-2026-10-13_113953.jpg" alt="참여방법 안내 1" width="100%" data-align="center" style="width: 100%; height: auto; max-width: 100%;">',
  '<img src="https://nwsytxwurnaxaabztomh.supabase.co/storage/v1/object/public/board-uploads/board-images/church_news/d6aec802-50d2-469a-87e1-a47ab6209604/1791867487209-2026-10-13_114047.jpg" alt="참여방법 안내 2" width="100%" data-align="center" style="width: 100%; height: auto; max-width: 100%;">',
  '</div>',
  '<img src="https://nwsytxwurnaxaabztomh.supabase.co/storage/v1/object/public/board-uploads/board-images/church_news/d6aec802-50d2-469a-87e1-a47ab6209604/1791867536877-2026-10-13_114311.jpg" alt="미니게임 화면" width="100%" data-align="center" style="width: 100%; height: auto; display: block; margin: 0.75rem auto; max-width: 100%;">',
  '<p></p>'
)
WHERE id = 'd6aec802-50d2-469a-87e1-a47ab6209604'
  AND post_type = 'church_news'
  AND title = '추수감사절 미니게임 이벤트 진행';
