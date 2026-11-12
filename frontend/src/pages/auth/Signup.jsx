import { Link } from 'react-router-dom';

import { AuthForm } from './components/AuthForm.jsx';

export function Signup() {
  return (
    <section className="mx-auto max-w-md space-y-5">
      <div>
        <p className="text-sm font-bold uppercase text-ember">Join the puzzle</p>
        <h1 className="mt-2 text-4xl font-black">Sign up</h1>
      </div>
      <AuthForm mode="signup" />
      <p className="text-sm text-stone-600">
        Already have an account?{' '}
        <Link to="/auth/login" className="font-bold text-ink underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
