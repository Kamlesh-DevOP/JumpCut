import { Link } from 'react-router-dom';

import { AuthForm } from './components/AuthForm.jsx';

export function Login() {
  return (
    <section className="mx-auto max-w-md space-y-5">
      <div>
        <p className="text-sm font-bold uppercase text-ember">Welcome back</p>
        <h1 className="mt-2 text-4xl font-black">Log in</h1>
      </div>
      <AuthForm mode="login" />
      <p className="text-sm text-stone-600">
        New to JumpCut?{' '}
        <Link to="/auth/signup" className="font-bold text-ink underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
