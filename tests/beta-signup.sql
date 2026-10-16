-- Run as postgres in an explicit transaction; no permanent users or mail.
begin;
update registration_private.beta_gate
set enabled = true,
    code_sha256 = encode(sha256(convert_to('mock-test-code.', 'UTF8')), 'hex')
where singleton;

do $$
declare candidate text;
begin
  if public.check_beta_signup('{"user":{"user_metadata":{"beta_code":"mock-test-code."}}}') <> '{}'::jsonb then
    raise exception 'valid code denied';
  end if;
  if public.check_beta_signup('{"user":{"user_metadata":{"beta_code":"  mock-test-code.  "}}}') <> '{}'::jsonb then
    raise exception 'trimmed code denied';
  end if;
  if (public.check_beta_signup('{"user":{}}') #>> '{error,http_code}') <> '403' then
    raise exception 'missing code accepted';
  end if;
  foreach candidate in array array['', 'wrong-code', 'mock-test-code', 'MOCK-test-code.', repeat('x',129)] loop
    if (public.check_beta_signup(jsonb_build_object('user', jsonb_build_object('user_metadata', jsonb_build_object('beta_code', candidate)))) #>> '{error,http_code}') <> '403' then
      raise exception 'invalid code accepted';
    end if;
  end loop;
end;
$$;

update registration_private.beta_gate set enabled = false where singleton;
do $$
begin
  if (public.check_beta_signup('{}') #>> '{error,http_code}') <> '503' then
    raise exception 'disabled configuration fails open';
  end if;
end;
$$;

update registration_private.beta_gate set enabled = true, code_sha256 = null where singleton;
do $$
begin
  if (public.check_beta_signup('{}') #>> '{error,http_code}') <> '503' then
    raise exception 'missing verifier fails open';
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege('supabase_auth_admin', 'public.check_beta_signup(jsonb)', 'execute')
    or not has_schema_privilege('supabase_auth_admin', 'registration_private', 'usage')
    or not has_table_privilege('supabase_auth_admin', 'registration_private.beta_gate', 'select') then
    raise exception 'auth service missing gate permissions';
  end if;
  if has_function_privilege('anon', 'public.check_beta_signup(jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.check_beta_signup(jsonb)', 'execute')
    or has_table_privilege('anon', 'registration_private.beta_gate', 'select')
    or has_table_privilege('authenticated', 'registration_private.beta_gate', 'select') then
    raise exception 'private registration gate exposed';
  end if;
end;
$$;

create temporary table beta_cleanup_test (raw_user_meta_data jsonb);
create trigger test_cleanup before insert or update on beta_cleanup_test
  for each row execute function registration_private.strip_beta_signup_code();
insert into beta_cleanup_test values ('{"beta_code":"mock-test-code.","display_name":"Keep me"}');
do $$
begin
  if (select raw_user_meta_data from beta_cleanup_test) <> '{"display_name":"Keep me"}'::jsonb then
    raise exception 'code not removed or unrelated metadata changed';
  end if;
end;
$$;

rollback;
select 'PASS: valid/missing/wrong/case/period/length codes, fail-closed config, private permissions and metadata cleanup; all test changes rolled back' as result;
