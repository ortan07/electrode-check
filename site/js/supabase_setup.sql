-- รันใน Supabase → SQL Editor (ครั้งเดียว)
create table if not exists electrode_state (
  id int primary key,
  data jsonb,
  updated_at timestamptz not null default now()
);
insert into electrode_state (id) values (1) on conflict do nothing;

create or replace function touch_updated() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists electrode_touch on electrode_state;
create trigger electrode_touch before update on electrode_state
  for each row execute function touch_updated();

alter table electrode_state enable row level security;
create policy "electrode read"   on electrode_state for select to anon using (true);
create policy "electrode update" on electrode_state for update to anon using (true) with check (true);

-- bucket เก็บรูป NG
insert into storage.buckets (id, name, public) values ('ng-photos', 'ng-photos', true) on conflict do nothing;
create policy "ngphoto read"   on storage.objects for select to anon using (bucket_id = 'ng-photos');
create policy "ngphoto insert" on storage.objects for insert to anon with check (bucket_id = 'ng-photos');
create policy "ngphoto update" on storage.objects for update to anon using (bucket_id = 'ng-photos') with check (bucket_id = 'ng-photos');
