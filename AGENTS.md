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

- Keep theme imagery in a shared map-image registry so lobby choices and room backgrounds use the same theme.
- Completed race records are public nickname-only data; load mode-based leaderboards through TanStack Query, validate inserts, prohibit updates, and allow deletes only with authenticated server-validated admin roles and RLS.
- Keep nickname warning logic in a pure helper so the three-warning rule can be tested independently.
- Store creator roles separately from users; provision the initial creator only after identifying the requester's authenticated account, never through a public passphrase or first-signup promotion.
- Global moderation is nickname-scoped because players are anonymous; use an atomic admin-only warning RPC, shared warning counts, and an insert trigger to enforce anonymous completion names at three warnings.
