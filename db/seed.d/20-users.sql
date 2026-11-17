-- Demo accounts, added once (only while the users table is empty). No passwords are set here:
-- the login code decides how passwords are hashed and sets password_hash for these accounts.
do $$
begin
  if exists (select 1 from users) then
    return;
  end if;

  insert into users (login_id, name, role) values
    ('admin',       'Administrator',    'admin'),
    ('riya',        'Riya',             'volunteer'),
    ('arjun',       'Arjun',            'volunteer'),
    ('sara',        'Sara',             'volunteer'),
    ('meera',       'Meera',            'volunteer'),
    ('dev',         'Dev',              'volunteer'),
    ('kabir',       'Kabir',            'volunteer'),
    ('participant', 'Demo Participant', 'participant');
end $$;
