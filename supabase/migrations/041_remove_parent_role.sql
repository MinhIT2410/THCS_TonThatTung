-- 041_remove_parent_role.sql
-- Remove the PARENT role from the system

-- Delete assignments of PARENT role from users
DELETE FROM public.user_roles WHERE role_code = 'PARENT';

-- Delete PARENT role definition from roles
DELETE FROM public.roles WHERE code = 'PARENT';
