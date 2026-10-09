<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project decisions

- DHA Attendance runs on live Supabase data only (Assignment 2). Mock data and in-memory demo state were removed; every screen reads and writes its table through `@/integrations/supabase/client`.
- Authentication is Supabase email/password. Protected routes use `ssr: false` and the `Protected` wrapper in `src/components/shell.tsx`, because the session lives in the browser.
- Roles are stored in `user_roles`, never on `profiles`, and enforced by RLS through the `has_role` / `is_staff` / `is_admin` security-definer functions. The first sign-up becomes `system_admin`.
- Schema changes go through SQL files in `supabase/migrations/` (UUID keys, timestamps and RLS on every table), and every new public table gets explicit `GRANT`s, because Supabase gives the Data API no default privileges.
- `src/integrations/supabase/types.ts` is regenerated from the live schema and is never edited by hand; app code imports its row and enum types from `src/lib/db-types.ts`, the project's stable naming layer over the generated `Database` type, so a schema regeneration cannot break an import.
- Use one shared application shell across leaf routes, because role-aware navigation must remain consistent while browsing.
