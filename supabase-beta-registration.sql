-- Install before enabling the Before User Created hook. No production code or
-- verifier belongs in this file. Configure its private row separately.
begin;

create schema if not exists registration_private;
revoke all on schema registration_private from public, anon, authenticated;

create table if not exists registration_private.beta_gate (
  singleton boolean primary key default true check (singleton),
  code_sha256 text check (code_sha256 ~ '^[a-f0-9]{64}$'),
  enabled boolean not null default true
);
alter table registration_private.beta_gate enable row level security;
revoke all on registration_private.beta_gate from public, anon, authenticated;
insert into registration_private.beta_gate(singleton) values (true)
on conflict (singleton) do nothing;

grant usage on schema registration_private to supabase_auth_admin;
grant select on registration_private.beta_gate to supabase_auth_admin;
drop policy if exists beta_gate_auth_read on registration_private.beta_gate;
create policy beta_gate_auth_read on registration_private.beta_gate
  for select to supabase_auth_admin using (true);

create or replace function public.check_beta_signup(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  supplied text := btrim(coalesce(event->'user'->'user_metadata'->>'beta_code', ''));
  expected text;
begin
  select code_sha256 into expected
    from registration_private.beta_gate where singleton and enabled;
  if expected is null then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 503, 'message', '注册校验暂不可用，请稍后再试；仍可本地使用。'));
  end if;
  if supplied = '' or length(supplied) > 128
     or encode(sha256(convert_to(supplied, 'UTF8')), 'hex') <> expected then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', '内测码无效，请确认后重试；没有内测码也可本地使用。'));
  end if;
  return '{}'::jsonb;
end;
$$;
revoke all on function public.check_beta_signup(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.check_beta_signup(jsonb) to supabase_auth_admin;

-- The auth hook validates before INSERT; strip the transient code before any
-- auth row or JWT can retain it. No existing users are updated.
create or replace function registration_private.strip_beta_signup_code()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'beta_code';
  return new;
end;
$$;
revoke all on function registration_private.strip_beta_signup_code() from public, anon, authenticated;
drop trigger if exists strip_beta_signup_code on auth.users;
create trigger strip_beta_signup_code before insert or update of raw_user_meta_data
  on auth.users for each row
  execute function registration_private.strip_beta_signup_code();

commit;
