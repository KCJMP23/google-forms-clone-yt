'use client';

import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  CollaborationUser,
  ChangeOperation,
  PresenceUpdate,
} from '../collaboration';

interface UseCollaborationOptions {
  formId: string;
  userId: string;
  userName: string;
  onUserJoined?: (user: CollaborationUser) => void;
  onUserLeft?: (userId: string) => void;
  onFormChanged?: (operation: ChangeOperation) => void;
  onCursorMoved?: (userId: string, cursor: { fieldId: string; position: number }) => void;
  onFieldLocked?: (fieldId: string, userId: string) => void;
  onLockReleased?: (fieldId: string) => void;
  onPresenceUpdated?: (update: PresenceUpdate) => void;
}

export function useCollaboration(options: UseCollaborationOptions) {
  const {
    formId,
    userId,
    userName,
    onUserJoined,
    onUserLeft,
    onFormChanged,
    onCursorMoved,
    onFieldLocked,
    onLockReleased,
    onPresenceUpdated,
  } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [locks, setLocks] = useState<Record<string, string>>({});

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Join form editing session
      newSocket.emit('join-form', { formId, userId, userName });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Session state (initial load)
    newSocket.on('session-state', (data: {
      sessionId: string;
      users: CollaborationUser[];
      locks: Record<string, string>;
    }) => {
      setUsers(data.users);
      setLocks(data.locks);
    });

    // User joined
    newSocket.on('user-joined', (data: { user: CollaborationUser }) => {
      setUsers((prev) => [...prev, data.user]);
      onUserJoined?.(data.user);
    });

    // User left
    newSocket.on('user-left', (data: { userId: string }) => {
      setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      onUserLeft?.(data.userId);
    });

    // Form changed
    newSocket.on('form-changed', (data: { operation: ChangeOperation }) => {
      onFormChanged?.(data.operation);
    });

    // Cursor moved
    newSocket.on('cursor-moved', (data: {
      userId: string;
      cursor: { fieldId: string; position: number };
    }) => {
      // Update user cursor in local state
      setUsers((prev) =>
        prev.map((user) =>
          user.userId === data.userId
            ? { ...user, cursor: data.cursor }
            : user
        )
      );
      onCursorMoved?.(data.userId, data.cursor);
    });

    // Lock granted
    newSocket.on('lock-granted', (data: { fieldId: string }) => {
      setLocks((prev) => ({ ...prev, [data.fieldId]: userId }));
    });

    // Lock denied
    newSocket.on('lock-denied', (data: { fieldId: string; lockedBy: string }) => {
      // Handle lock denial (e.g., show notification)
      console.log(`Field ${data.fieldId} is locked by ${data.lockedBy}`);
    });

    // Field locked by another user
    newSocket.on('field-locked', (data: { fieldId: string; userId: string }) => {
      setLocks((prev) => ({ ...prev, [data.fieldId]: data.userId }));
      onFieldLocked?.(data.fieldId, data.userId);
    });

    // Lock released
    newSocket.on('lock-released', (data: { fieldId: string }) => {
      setLocks((prev) => {
        const newLocks = { ...prev };
        delete newLocks[data.fieldId];
        return newLocks;
      });
      onLockReleased?.(data.fieldId);
    });

    // Presence updated
    newSocket.on('presence-updated', (data: PresenceUpdate) => {
      onPresenceUpdated?.(data);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      newSocket.emit('leave-form', { formId, userId });
      newSocket.close();
    };
  }, [formId, userId, userName]);

  /**
   * Send form change
   */
  const sendChange = useCallback(
    (operation: Omit<ChangeOperation, 'id' | 'timestamp'>) => {
      if (!socket) return;

      const fullOperation: ChangeOperation = {
        ...operation,
        id: Math.random().toString(36).substring(2),
        timestamp: new Date(),
      };

      socket.emit('form-change', { formId, operation: fullOperation });
    },
    [socket, formId]
  );

  /**
   * Update cursor position
   */
  const updateCursor = useCallback(
    (cursor: { fieldId: string; position: number }) => {
      if (!socket) return;

      socket.emit('cursor-update', { formId, userId, cursor });
    },
    [socket, formId, userId]
  );

  /**
   * Request field lock
   */
  const requestLock = useCallback(
    (fieldId: string) => {
      if (!socket) return;

      socket.emit('request-lock', { formId, userId, fieldId });
    },
    [socket, formId, userId]
  );

  /**
   * Release field lock
   */
  const releaseLock = useCallback(
    (fieldId: string) => {
      if (!socket) return;

      socket.emit('release-lock', { formId, userId, fieldId });
    },
    [socket, formId, userId]
  );

  /**
   * Update presence
   */
  const updatePresence = useCallback(
    (status: 'online' | 'away' | 'offline', cursor?: { fieldId: string; position: number }) => {
      if (!socket) return;

      const update: PresenceUpdate & { formId: string } = {
        formId,
        userId,
        status,
        cursor,
        timestamp: new Date(),
      };

      socket.emit('presence-update', update);
    },
    [socket, formId, userId]
  );

  return {
    users,
    isConnected,
    locks,
    sendChange,
    updateCursor,
    requestLock,
    releaseLock,
    updatePresence,
  };
}
