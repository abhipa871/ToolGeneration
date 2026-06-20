# Lessons

- On Windows PowerShell environments where script execution is restricted, run project scripts with `npm.cmd` instead of `npm` so `npm.ps1` does not block verification.
- Keep Supabase's `service_role` key server-only. Browser chat persistence must call the application's server routes rather than Supabase directly.
- Read Supabase's public Auth settings before rendering OAuth actions. A configured client button does not mean the provider is enabled; disable unavailable providers and explain the dashboard requirement.
- Password managers and form-filling extensions may inject attributes such as `fdprocessedid` before hydration. Use targeted `suppressHydrationWarning` on affected controls instead of masking hydration warnings globally.
- Preserve `server-only` imports in production modules and alias that marker to a no-op in Vitest; otherwise Vite cannot resolve Next.js's compile-time boundary package during unit tests.
