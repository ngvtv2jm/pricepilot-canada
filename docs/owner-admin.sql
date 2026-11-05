-- Run only in the SQL editor for the pricepilot-canada database.
-- Grants catalog/operations administration to the confirmed existing owner.
-- No password, source configuration, or authentication bypass is created.
begin;
do $$
begin
 if (select count(*) from auth.users where id='83750025-b7e5-4852-95f6-639d4674dfbd'::uuid and lower(email)='seansinclairjm@gmail.com') <> 1 then
   raise exception 'The expected owner account was not found. No role change made.';
 end if;
 insert into private.admin_users(user_id) values('83750025-b7e5-4852-95f6-639d4674dfbd'::uuid) on conflict(user_id) do nothing;
end $$;
select u.email,exists(select 1 from private.admin_users a where a.user_id=u.id) as is_admin
from auth.users u where u.id='83750025-b7e5-4852-95f6-639d4674dfbd'::uuid;
commit;
