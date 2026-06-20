create policy "deny direct credential access"
on public.user_api_credentials
for all
to anon, authenticated
using (false)
with check (false);

create policy "deny direct credential event access"
on public.api_credential_events
for all
to anon, authenticated
using (false)
with check (false);

