import { Link } from 'react-router-dom';

import { AuthForm } from './components/AuthForm.jsx';

export function Login() {
  return (
    <section className="mx-auto max-w-md space-y-5 py-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">Welcome back</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Log in</h1>
      </div>
      <AuthForm mode="login" />
      <p className="text-sm text-parchment/55">
        New to JumpCut?{' '}
        <Link to="/auth/signup" className="font-medium text-amber underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
