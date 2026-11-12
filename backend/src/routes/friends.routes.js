import { Router } from 'express';

import { supabase } from '../db/supabase.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError } from '../utils/app-error.js';

export const friendsRouter = Router();

friendsRouter.get('/', verifyToken, async (req, res, next) => {
  try {
    const friendships = await getFriendships(req.user.id, 'accepted');
    const friendIds = friendships.map((friendship) => otherUserId(friendship, req.user.id));
    const profiles = await getProfiles(friendIds);
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    res.json({
      friends: friendships
        .map((friendship) => {
          const userId = otherUserId(friendship, req.user.id);
          const profile = profileById.get(userId);

          return profile && {
            friendship_id: friendship.id,
            user_id: profile.id,
            username: profile.username,
            jumpcut_id: profile.jumpcut_id
          };
        })
        .filter(Boolean)
    });
  } catch (error) {
    next(error);
  }
});

friendsRouter.get('/requests', verifyToken, async (req, res, next) => {
  try {
    const { data: requests, error } = await supabase
      .from('friends')
      .select('id, requester_id, created_at')
      .eq('addressee_id', req.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const profiles = await getProfiles(requests.map((request) => request.requester_id));
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    res.json({
      requests: requests
        .map((request) => {
          const profile = profileById.get(request.requester_id);
          return profile && {
            friendship_id: request.id,
            from_username: profile.username,
            from_jumpcut_id: profile.jumpcut_id,
            created_at: request.created_at
          };
        })
        .filter(Boolean)
    });
  } catch (error) {
    next(error);
  }
});

friendsRouter.post('/request', verifyToken, async (req, res, next) => {
  try {
    const jumpcutId = normalizeJumpcutId(req.body?.jumpcut_id);
    const { data: addressee, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, jumpcut_id')
      .eq('jumpcut_id', jumpcutId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }
    if (!addressee) {
      throw new AppError('PROFILE_NOT_FOUND', 'No user found with that JumpCut ID.', 404);
    }
    if (addressee.id === req.user.id) {
      throw new AppError('CANNOT_FRIEND_SELF', 'You cannot send a friend request to yourself.', 400);
    }

    const { data: existing, error: existingError } = await supabase
      .from('friends')
      .select('id')
      .or(`and(requester_id.eq.${req.user.id},addressee_id.eq.${addressee.id}),and(requester_id.eq.${addressee.id},addressee_id.eq.${req.user.id})`)
      .limit(1);

    if (existingError) {
      throw existingError;
    }
    if (existing.length > 0) {
      throw new AppError('FRIENDSHIP_EXISTS', 'A friend request already exists between these users.', 400);
    }

    const { data: friendship, error: insertError } = await supabase
      .from('friends')
      .insert({ requester_id: req.user.id, addressee_id: addressee.id })
      .select('id, status, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(201).json({ friendship, to: addressee });
  } catch (error) {
    next(error);
  }
});

friendsRouter.patch('/:friendshipId/accept', verifyToken, async (req, res, next) => {
  try {
    const friendship = await getFriendship(req.params.friendshipId);

    if (friendship.addressee_id !== req.user.id) {
      throw new AppError('FORBIDDEN', 'Only the request recipient can accept this request.', 403);
    }
    if (friendship.status !== 'pending') {
      throw new AppError('REQUEST_NOT_PENDING', 'This friend request is no longer pending.', 400);
    }

    const { data, error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendship.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    next(error);
  }
});

friendsRouter.delete('/:friendshipId', verifyToken, async (req, res, next) => {
  try {
    const friendship = await getFriendship(req.params.friendshipId);

    if (friendship.requester_id !== req.user.id && friendship.addressee_id !== req.user.id) {
      throw new AppError('FORBIDDEN', 'You cannot remove this friendship.', 403);
    }

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendship.id);

    if (error) {
      throw error;
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

async function getFriendships(userId, status) {
  const { data, error } = await supabase
    .from('friends')
    .select('id, requester_id, addressee_id')
    .eq('status', status)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    throw error;
  }
  return data;
}

async function getProfiles(ids) {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, jumpcut_id')
    .in('id', ids);

  if (error) {
    throw error;
  }
  return data;
}

async function getFriendship(friendshipId) {
  const { data, error } = await supabase
    .from('friends')
    .select('id, requester_id, addressee_id, status')
    .eq('id', friendshipId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new AppError('FRIENDSHIP_NOT_FOUND', 'No friendship found.', 404);
  }
  return data;
}

function otherUserId(friendship, userId) {
  return friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id;
}

function normalizeJumpcutId(value) {
  if (typeof value !== 'string' || !/^jc_[a-z0-9]{6}$/i.test(value.trim())) {
    throw new AppError('INVALID_JUMPCUT_ID', 'Enter a valid JumpCut ID.', 400);
  }
  return value.trim().toLowerCase();
}
