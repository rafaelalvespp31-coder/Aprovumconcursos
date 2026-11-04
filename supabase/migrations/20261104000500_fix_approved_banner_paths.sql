-- O Postgres aceita no máximo 255 repetições em expressão regular: {5,300} fazia todo INSERT falhar
-- ("invalid regular expression: invalid repetition count(s)"). Os caminhos têm ~60 caracteres.
alter table public.approved_banners drop constraint if exists approved_banners_image_path_check;
alter table public.approved_banners drop constraint if exists approved_banners_image_sm_check;
alter table public.approved_banners add constraint approved_banners_image_path_check check (image_path ~ '^[a-z0-9/_.-]{5,255}$');
alter table public.approved_banners add constraint approved_banners_image_sm_check check (image_sm ~ '^[a-z0-9/_.-]{5,255}$');
