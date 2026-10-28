import { buttonSnapTrade, large } from "@/components/ui";

// SnapTrade's colours rather than the accent: the accent marks Vaultfolio's own
// actions, and this one hands off to SnapTrade. A plain anchor, because
// next/link would prefetch /login and start OAuth attempts.
export function SignInLink() {
  return (
    <a href="/login" className={large(buttonSnapTrade)}>
      Sign in with SnapTrade
    </a>
  );
}
