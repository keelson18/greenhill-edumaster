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

- Keep fee paging/validation helpers in `finance.query.ts`, separate from server functions, so UI and tests share the same bounded page contract.
- Fetch fee lists by stable name/id ranges and page financial reads explicitly; otherwise response caps silently omit learners or payments.
- Keep learner admission/edit dialogs and examination creation dialogs in feature components; routes own list selection, mutations and cache invalidation.
