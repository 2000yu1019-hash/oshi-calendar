-- 最初から登録しておくアーティストと、自動取得の検索条件
insert into public.artists (name, aliases, color, country, links) values
  ('Mrs. GREEN APPLE', '{"ミセス","ミセスグリーンアップル","大森元貴","若井滉斗","藤澤涼架"}', '#7be36b', 'JP',
   '{"official":"https://mrsgreenapple.com/","x":"https://x.com/AppleMrsGreen"}'),
  ('テイラー・スウィフト', '{"Taylor Swift","テイラースウィフト"}', '#c9a4ff', 'US',
   '{"official":"https://www.taylorswift.com/","x":"https://x.com/taylorswift13","instagram":"https://www.instagram.com/taylorswift/"}'),
  ('ドレイク', '{"Drake","Aubrey Graham","OVO"}', '#ffb44d', 'CA',
   '{"official":"https://drakerelated.com/","instagram":"https://www.instagram.com/champagnepapi/"}')
on conflict (name) do nothing;

-- Googleニュース検索（日本語）でライブ・出演・コラボの報道を拾う
insert into public.artist_sources (artist_id, kind, query, label)
select a.id, 'google_news', q.query, q.label
from public.artists a
join (values
  ('Mrs. GREEN APPLE', '"Mrs. GREEN APPLE" (ライブ OR ツアー OR 出演 OR コラボ OR 発売 OR 番組)', 'ニュース'),
  ('Mrs. GREEN APPLE', '"Mrs. GREEN APPLE" (コラボ OR グッズ OR キャンペーン OR 限定)', 'コラボ'),
  ('テイラー・スウィフト', '"テイラー・スウィフト" (来日 OR 公演 OR 発売 OR 出演 OR コラボ)', 'ニュース'),
  ('テイラー・スウィフト', '"Taylor Swift" (tour OR album OR release OR collaboration)', '海外ニュース'),
  ('ドレイク', '"ドレイク" (来日 OR 公演 OR 発売 OR コラボ) ラッパー', 'ニュース'),
  ('ドレイク', '"Drake" (tour OR album OR release OR collab) rapper', '海外ニュース')
) as q(name, query, label) on q.name = a.name;
