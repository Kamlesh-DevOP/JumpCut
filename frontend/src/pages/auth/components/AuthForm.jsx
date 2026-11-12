import { useState } from 'react';

import { Button } from '../../../components/ui/Button.jsx';
import { hasSupabaseConfig, supabase } from '../../../lib/supabase.js';

export function AuthForm({ mode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSignup = mode === 'signup';

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    if (!hasSupabaseConfig) {
      setMessage('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable auth.');
      setIsSubmitting(false);
      return;
    }

    const { error } = isSignup
      ? await supabase.auth.signUp({ email, password, options: { data: { username } } })
      : await supabase.auth.signInWithPassword({ email, password });

    setMessage(error ? error.message : isSignup ? 'Check your email to confirm signup.' : 'Logged in.');
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
      {isSignup && (
        <label className="block">
          <span className="text-sm font-bold text-stone-700">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
            required
          />
        </label>
      )}
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          required
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-stone-700">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
          required
        />
      </label>
      {message && <p className="rounded-md bg-stone-100 p-3 text-sm font-semibold text-stone-700">{message}</p>}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Working' : isSignup ? 'Create account' : 'Log in'}
      </Button>
    </form>
  );
}
