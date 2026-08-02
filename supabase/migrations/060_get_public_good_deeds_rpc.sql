-- Migration 060: Add get_public_good_deeds RPC for public competition overview page
create or replace function public.get_public_good_deeds(
  p_limit integer default 6,
  p_offset integer default 0
)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_offset integer;
  v_result json;
begin
  v_limit := least(greatest(coalesce(p_limit, 6), 1), 20);
  v_offset := greatest(coalesce(p_offset, 0), 0);

  select json_agg(t)
  into v_result
  from (
    select
      ci.id as incident_id,
      ci.student_id,
      coalesce(p.full_name, 'Đội viên') as full_name,
      p.student_code,
      p.avatar_url,
      coalesce(c.name, 'Chi đội') as class_name,
      ci.title,
      ci.description,
      ci.occurred_at,
      coalesce(cr.student_merit_points, 0) as reward_points,
      (
        select json_agg(json_build_object(
          'id', ev.id,
          'file_url', ev.file_url,
          'external_url', ev.external_url,
          'caption', ev.caption
        ) order by ev.display_order asc)
        from public.competition_incident_evidence ev
        where ev.incident_id = ci.id
      ) as evidence_items
    from public.competition_incidents ci
    inner join public.competition_rules cr on cr.id = ci.rule_id
    left join public.profiles p on p.id = ci.student_id
    left join public.classes c on c.id = ci.unit_id
    where ci.status = 'APPROVED'
      and cr.category = 'GOOD_DEED'
    order by ci.occurred_at desc, ci.created_at desc
    limit v_limit
    offset v_offset
  ) t;

  return coalesce(v_result, '[]'::json);
end;
$$;

revoke execute on function public.get_public_good_deeds(integer, integer) from public;
grant execute on function public.get_public_good_deeds(integer, integer) to anon, authenticated;
