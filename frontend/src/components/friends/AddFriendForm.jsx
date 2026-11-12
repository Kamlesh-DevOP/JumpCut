import { UserPlus } from 'lucide-react';

import { Button } from '../ui/Button.jsx';

export function AddFriendForm({ isSending, value, onChange, onSubmit }) {
  return (
    <form className="border-y border-card-border py-5" onSubmit={onSubmit}>
      <label className="text-xs font-medium uppercase tracking-[0.15em] text-parchment/60" htmlFor="jumpcut-id">
        Add by JumpCut ID
      </label>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          id="jumpcut-id"
          className="min-h-10 flex-1 border border-card-border bg-noir px-3 font-mono text-sm text-parchment outline-none placeholder:text-ash focus:border-amber"
          maxLength={9}
          placeholder="jc_a1b2c3"
          required
          value={value}
          onChange={(event) => onChange(event.target.value.toLowerCase())}
        />
        <Button disabled={isSending} type="submit">
          <UserPlus aria-hidden="true" size={16} /> {isSending ? 'Sending...' : 'Send request'}
        </Button>
      </div>
    </form>
  );
}
