-- Proactive Pipedream triggers belong to one logical connected account.
-- The connection foreign key keeps multi-account apps isolated and removes
-- the local trigger registry entry when its account is disconnected.

alter table public.chief_triggers
  add column if not exists connection_id uuid
    references public.pipedream_connections(id) on delete cascade;

create unique index if not exists chief_triggers_connection_component_idx
  on public.chief_triggers (user_id, connection_id, component_id)
  where connection_id is not null and component_id is not null;
