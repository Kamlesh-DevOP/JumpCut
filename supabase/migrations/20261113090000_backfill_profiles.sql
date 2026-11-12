create or replace function public.generate_unique_username(requested_username text, user_uuid uuid)
returns text
language plpgsql
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 1;
begin
  base_username := coalesce(nullif(trim(requested_username), ''), 'user_' || substr(replace(user_uuid::text, '-', ''), 1, 8));
  candidate := base_username;

  loop
    exit when not exists (
      select 1
      from public.profiles
      where username = candidate
    );

    candidate := base_username || '_' || suffix;
    suffix := suffix + 1;
  end loop;

  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, jumpcut_id)
  values (
    new.id,
    public.generate_unique_username(new.raw_user_meta_data->>'username', new.id),
    public.generate_unique_jumpcut_id()
  );

  return new;
end;
$$;

insert into public.profiles (id, username, jumpcut_id)
select
  auth_user.id,
  public.generate_unique_username(auth_user.raw_user_meta_data->>'username', auth_user.id),
  public.generate_unique_jumpcut_id()
from auth.users as auth_user
where not exists (
  select 1
  from public.profiles
  where profiles.id = auth_user.id
);
