import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import {
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriendship,
  sendFriendRequest
} from '../api/friends.js';
import { getApiErrorMessage } from '../api/client.js';
import { AddFriendForm } from '../components/friends/AddFriendForm.jsx';
import { FriendRow } from '../components/friends/FriendRow.jsx';
import { IncomingRequestRow } from '../components/friends/IncomingRequestRow.jsx';
import { Button } from '../components/ui/Button.jsx';

export function Friends() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [jumpcutId, setJumpcutId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');

  const loadFriends = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [nextFriends, nextRequests] = await Promise.all([getFriends(), getFriendRequests()]);
      setFriends(nextFriends);
      setRequests(nextRequests);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  async function handleSendRequest(event) {
    event.preventDefault();
    setFeedback('');
    setError('');
    setWorkingId('new-request');
    try {
      await sendFriendRequest(jumpcutId);
      setJumpcutId('');
      setFeedback('Friend request sent.');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorkingId('');
    }
  }

  async function handleRequestAction(request, action) {
    setFeedback('');
    setError('');
    setWorkingId(request.friendship_id);
    try {
      if (action === 'accept') {
        await acceptFriendRequest(request.friendship_id);
        setFeedback(`You and ${request.from_username} are now friends.`);
      } else {
        await removeFriendship(request.friendship_id);
        setFeedback('Friend request removed.');
      }
      await loadFriends();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorkingId('');
    }
  }

  async function handleRemove(friend) {
    setFeedback('');
    setError('');
    setWorkingId(friend.friendship_id);
    try {
      await removeFriendship(friend.friendship_id);
      setFeedback(`${friend.username} was removed from your friends.`);
      await loadFriends();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setWorkingId('');
    }
  }

  return (
    <section className="mx-auto max-w-4xl space-y-8 py-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber">Social</p>
        <h1 className="font-display mt-2 text-4xl font-bold text-parchment">Friends</h1>
      </div>

      <AddFriendForm isSending={workingId === 'new-request'} value={jumpcutId} onChange={setJumpcutId} onSubmit={handleSendRequest} />

      {(feedback || error) && (
        <p aria-live="polite" className={error ? 'text-sm text-crimson-light' : 'text-sm text-amber'}>
          {error || feedback}
        </p>
      )}

      <section aria-labelledby="requests-heading">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="requests-heading" className="font-display text-2xl font-medium text-parchment">Requests</h2>
          <span className="text-sm text-parchment/55">{requests.length}</span>
        </div>
        {isLoading ? <LoadingRows /> : requests.length > 0 ? (
          <ul className="space-y-2">
            {requests.map((request) => (
              <IncomingRequestRow key={request.friendship_id} request={request} isWorking={workingId === request.friendship_id} onAccept={(item) => handleRequestAction(item, 'accept')} onReject={(item) => handleRequestAction(item, 'reject')} />
            ))}
          </ul>
        ) : <EmptyState message="No incoming requests right now." />}
      </section>

      <section aria-labelledby="friends-heading">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 id="friends-heading" className="font-display text-2xl font-medium text-parchment">Your friends</h2>
          <Button aria-label="Refresh friends" className="min-h-9 px-3" disabled={isLoading} title="Refresh friends" variant="secondary" onClick={loadFriends}>
            <RefreshCw aria-hidden="true" size={16} />
          </Button>
        </div>
        {isLoading ? <LoadingRows /> : friends.length > 0 ? (
          <ul className="space-y-2">
            {friends.map((friend) => <FriendRow key={friend.friendship_id} friend={friend} isWorking={workingId === friend.friendship_id} onRemove={handleRemove} />)}
          </ul>
        ) : <EmptyState message="Add someone with their JumpCut ID to start a friend list." />}
      </section>
    </section>
  );
}

function EmptyState({ message }) {
  return <p className="border border-dashed border-card-border py-5 text-center text-sm text-parchment/50">{message}</p>;
}

function LoadingRows() {
  return <p className="py-5 text-sm text-parchment/50">Loading friends...</p>;
}
