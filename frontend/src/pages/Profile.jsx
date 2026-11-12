import { Check, Copy, LogIn, Pencil, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { getCurrentProfile, updateProfile } from '../api/user.js';
import { getApiErrorMessage } from '../api/client.js';
import { Button } from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';

export function Profile() {
  const { isLoading: isCheckingAuth, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    async function loadProfile() {
      setError('');
      try {
        const nextProfile = await getCurrentProfile();
        setProfile(nextProfile);
        setUsername(nextProfile.username);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError));
      }
    }

    loadProfile();
  }, [user]);

  async function copyJumpcutId() {
    await navigator.clipboard.writeText(profile.jumpcut_id);
    setCopied(true);
  }

  async function saveUsername(event) {
    event.preventDefault();
    setEditError('');
    setIsSaving(true);
    try {
      const nextProfile = await updateProfile(username);
      setProfile(nextProfile);
      setUsername(nextProfile.username);
      setIsEditing(false);
    } catch (requestError) {
      setEditError(getApiErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEdit() {
    setUsername(profile.username);
    setEditError('');
    setIsEditing(false);
  }

  return (
    <section className="space-y-5 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">Your stats</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Profile</h1>
      </div>
      {isCheckingAuth ? <p className="text-sm text-parchment/55">Checking your account...</p> : !user ? (
        <div className="border border-card-border bg-card-surface p-6">
          <p className="text-parchment/65">Log in to view your JumpCut ID and stats.</p>
          <Link className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber hover:text-parchment" to="/auth/login">
            <LogIn aria-hidden="true" size={16} /> Log in
          </Link>
        </div>
      ) : error ? <p className="border border-crimson-light/30 p-4 text-sm text-crimson-light">{error}</p> : !profile ? (
        <p className="text-sm text-parchment/55">Loading your profile...</p>
      ) : (
        <div className="border border-card-border bg-card-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-noir text-amber">
                <UserRound aria-hidden="true" size={22} />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-medium text-parchment">{profile.username}</h2>
                <p className="mt-1 truncate text-sm text-parchment/55">{user.email}</p>
              </div>
            </div>
            <Button aria-label="Edit username" className="shrink-0 px-3" title="Edit username" variant="secondary" onClick={() => { setEditError(''); setIsEditing(true); }}>
              <Pencil aria-hidden="true" size={16} />
            </Button>
          </div>
          {isEditing && (
            <form className="mt-5 border-t border-card-border pt-5" onSubmit={saveUsername}>
              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-parchment/55" htmlFor="profile-username">Display name</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="profile-username"
                  className="min-h-10 flex-1 border border-card-border bg-noir px-3 text-sm text-parchment outline-none focus:border-amber"
                  maxLength={32}
                  minLength={3}
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
                <Button disabled={isSaving} type="submit">{isSaving ? 'Saving...' : 'Save name'}</Button>
                <Button aria-label="Cancel edit" disabled={isSaving} title="Cancel edit" variant="secondary" onClick={cancelEdit}><X aria-hidden="true" size={16} /></Button>
              </div>
              {editError && <p className="mt-2 text-sm text-crimson-light">{editError}</p>}
            </form>
          )}
          <div className="mt-6 border-y border-card-border py-4">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-parchment/55">Your JumpCut ID</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <code className="font-display text-2xl font-bold text-amber">{profile.jumpcut_id}</code>
              <Button variant="secondary" onClick={copyJumpcutId}>
                {copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
                {copied ? 'Copied' : 'Copy ID'}
              </Button>
            </div>
          </div>
          <p className="mt-5 text-sm text-parchment/55">Share this ID with someone so they can send you a friend request.</p>
        </div>
      )}
    </section>
  );
}
