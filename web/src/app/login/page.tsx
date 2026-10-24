// Organizer sign-in.
// TODO(Kate, #7): email magic link via supabase.auth.signInWithOtp, plus an /auth/callback
//   route that exchanges the code for a session. Add Vercel + localhost to Supabase redirect URLs.
export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-sm text-gray-500">Magic-link login goes here (#7).</p>
    </main>
  );
}
