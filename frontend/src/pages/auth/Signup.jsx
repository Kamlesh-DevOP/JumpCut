import { Link } from 'react-router-dom';

import { AuthForm } from './components/AuthForm.jsx';

export function Signup() {
  return (
    <section className="mx-auto max-w-md space-y-5 py-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">Join the puzzle</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Sign up</h1>
      </div>
      <AuthForm mode="signup" />
      <p className="text-sm text-parchment/55">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-medium text-amber underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
