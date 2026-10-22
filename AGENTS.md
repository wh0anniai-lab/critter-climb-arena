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
- Completed race records are public nickname-only data; load leaderboards through TanStack Query and allow only validated inserts, not edits or deletes.
- Keep nickname warning logic in a pure helper so the three-warning rule can be tested independently.
