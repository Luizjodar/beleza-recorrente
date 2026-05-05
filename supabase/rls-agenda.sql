-- Execute este arquivo no SQL Editor do Supabase.
-- Ele permite que cada usuario gerencie apenas a agenda do proprio salao.

alter table public.agendamentos enable row level security;
alter table public.horarios_salao enable row level security;

drop policy if exists "Agenda do proprio salao - selecionar" on public.agendamentos;
drop policy if exists "Agenda do proprio salao - inserir" on public.agendamentos;
drop policy if exists "Agenda do proprio salao - atualizar" on public.agendamentos;
drop policy if exists "Agenda do proprio salao - excluir" on public.agendamentos;

create policy "Agenda do proprio salao - selecionar"
on public.agendamentos
for select
to authenticated
using (
  exists (
    select 1
    from public.saloes
    where saloes.id = agendamentos.salao_id
      and saloes.user_id = auth.uid()
  )
);

create policy "Agenda do proprio salao - inserir"
on public.agendamentos
for insert
to authenticated
with check (
  exists (
    select 1
    from public.saloes
    where saloes.id = agendamentos.salao_id
      and saloes.user_id = auth.uid()
  )
);

create policy "Agenda do proprio salao - atualizar"
on public.agendamentos
for update
to authenticated
using (
  exists (
    select 1
    from public.saloes
    where saloes.id = agendamentos.salao_id
      and saloes.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.saloes
    where saloes.id = agendamentos.salao_id
      and saloes.user_id = auth.uid()
  )
);

create policy "Agenda do proprio salao - excluir"
on public.agendamentos
for delete
to authenticated
using (
  exists (
    select 1
    from public.saloes
    where saloes.id = agendamentos.salao_id
      and saloes.user_id = auth.uid()
  )
);

drop policy if exists "Horarios do proprio salao - selecionar" on public.horarios_salao;
drop policy if exists "Horarios do proprio salao - inserir" on public.horarios_salao;
drop policy if exists "Horarios do proprio salao - atualizar" on public.horarios_salao;
drop policy if exists "Horarios do proprio salao - excluir" on public.horarios_salao;

create policy "Horarios do proprio salao - selecionar"
on public.horarios_salao
for select
to authenticated
using (
  exists (
    select 1
    from public.saloes
    where saloes.id = horarios_salao.salao_id
      and saloes.user_id = auth.uid()
  )
);

create policy "Horarios do proprio salao - inserir"
on public.horarios_salao
for insert
to authenticated
with check (
  exists (
    select 1
    from public.saloes
    where saloes.id = horarios_salao.salao_id
      and saloes.user_id = auth.uid()
  )
);

create policy "Horarios do proprio salao - atualizar"
on public.horarios_salao
for update
to authenticated
using (
  exists (
    select 1
    from public.saloes
    where saloes.id = horarios_salao.salao_id
      and saloes.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.saloes
    where saloes.id = horarios_salao.salao_id
      and saloes.user_id = auth.uid()
  )
);

create policy "Horarios do proprio salao - excluir"
on public.horarios_salao
for delete
to authenticated
using (
  exists (
    select 1
    from public.saloes
    where saloes.id = horarios_salao.salao_id
      and saloes.user_id = auth.uid()
  )
);
