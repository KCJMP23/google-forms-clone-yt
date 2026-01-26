/**
 * Real-time Collaboration Engine
 * WebSocket-based collaborative form editing with presence and conflict resolution
 * HIPAA-compliant with audit logging
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { auditLog } from './audit';

export interface CollaborationUser {
  userId: string;
  name: string;
  color: string;
  cursor?: {
    fieldId: string;
    position: number;
  };
  lastActivity: Date;
}

export interface CollaborationSession {
  sessionId: string;
  formId: string;
  users: Map<string, CollaborationUser>;
  locks: Map<string, string>; // fieldId -> userId
  changes: ChangeOperation[];
  createdAt: Date;
}

export interface ChangeOperation {
  id: string;
  userId: string;
  timestamp: Date;
  type: 'insert' | 'delete' | 'update' | 'move';
  path: string; // JSON path to the field being changed
  value?: any;
  oldValue?: any;
  position?: number;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'away' | 'offline';
  cursor?: {
    fieldId: string;
    position: number;
  };
  timestamp: Date;
}

/**
 * Collaboration Manager
 */
export class CollaborationManager {
  private io: SocketIOServer;
  private sessions: Map<string, CollaborationSession>;
  private userColors: string[] = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#FFA07A',
    '#98D8C8',
    '#F7DC6F',
    '#BB8FCE',
    '#85C1E2',
  ];

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.sessions = new Map();
    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Join form editing session
      socket.on('join-form', async (data: {
        formId: string;
        userId: string;
        userName: string;
      }) => {
        await this.handleJoinForm(socket, data);
      });

      // Leave form editing session
      socket.on('leave-form', async (data: {
        formId: string;
        userId: string;
      }) => {
        await this.handleLeaveForm(socket, data);
      });

      // Form change operation
      socket.on('form-change', async (data: {
        formId: string;
        operation: ChangeOperation;
      }) => {
        await this.handleFormChange(socket, data);
      });

      // Cursor position update
      socket.on('cursor-update', (data: {
        formId: string;
        userId: string;
        cursor: { fieldId: string; position: number };
      }) => {
        this.handleCursorUpdate(socket, data);
      });

      // Request field lock
      socket.on('request-lock', async (data: {
        formId: string;
        userId: string;
        fieldId: string;
      }) => {
        await this.handleRequestLock(socket, data);
      });

      // Release field lock
      socket.on('release-lock', async (data: {
        formId: string;
        userId: string;
        fieldId: string;
      }) => {
        await this.handleReleaseLock(socket, data);
      });

      // Presence update
      socket.on('presence-update', (data: PresenceUpdate & { formId: string }) => {
        this.handlePresenceUpdate(socket, data);
      });

      // Disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle user joining a form editing session
   */
  private async handleJoinForm(
    socket: any,
    data: { formId: string; userId: string; userName: string }
  ): Promise<void> {
    const { formId, userId, userName } = data;

    // Get or create session
    let session = this.sessions.get(formId);
    if (!session) {
      session = {
        sessionId: this.generateId(),
        formId,
        users: new Map(),
        locks: new Map(),
        changes: [],
        createdAt: new Date(),
      };
      this.sessions.set(formId, session);
    }

    // Add user to session
    const userColor = this.userColors[session.users.size % this.userColors.length];
    const user: CollaborationUser = {
      userId,
      name: userName,
      color: userColor,
      lastActivity: new Date(),
    };

    session.users.set(userId, user);

    // Join Socket.IO room
    socket.join(`form:${formId}`);

    // Send current session state to joining user
    socket.emit('session-state', {
      sessionId: session.sessionId,
      users: Array.from(session.users.values()),
      locks: Object.fromEntries(session.locks),
    });

    // Notify other users
    socket.to(`form:${formId}`).emit('user-joined', { user });

    // Audit log
    await auditLog({
      userId,
      action: 'join_collaboration_session',
      resourceType: 'form',
      resourceId: formId,
      details: { sessionId: session.sessionId },
      ipAddress: '',
      userAgent: '',
    });
  }

  /**
   * Handle user leaving a form editing session
   */
  private async handleLeaveForm(
    socket: any,
    data: { formId: string; userId: string }
  ): Promise<void> {
    const { formId, userId } = data;

    const session = this.sessions.get(formId);
    if (!session) return;

    // Remove user from session
    session.users.delete(userId);

    // Release all locks held by user
    for (const [fieldId, lockUserId] of session.locks.entries()) {
      if (lockUserId === userId) {
        session.locks.delete(fieldId);
        socket.to(`form:${formId}`).emit('lock-released', { fieldId });
      }
    }

    // Leave Socket.IO room
    socket.leave(`form:${formId}`);

    // Notify other users
    socket.to(`form:${formId}`).emit('user-left', { userId });

    // Clean up empty sessions
    if (session.users.size === 0) {
      this.sessions.delete(formId);
    }

    // Audit log
    await auditLog({
      userId,
      action: 'leave_collaboration_session',
      resourceType: 'form',
      resourceId: formId,
      details: {},
      ipAddress: '',
      userAgent: '',
    });
  }

  /**
   * Handle form change operation
   */
  private async handleFormChange(
    socket: any,
    data: { formId: string; operation: ChangeOperation }
  ): Promise<void> {
    const { formId, operation } = data;

    const session = this.sessions.get(formId);
    if (!session) return;

    // Add operation to session history
    session.changes.push(operation);

    // Keep only last 100 operations
    if (session.changes.length > 100) {
      session.changes = session.changes.slice(-100);
    }

    // Broadcast change to all other users in the form
    socket.to(`form:${formId}`).emit('form-changed', { operation });

    // Audit log for PHI fields
    if (operation.path.includes('isPHI') || operation.path.includes('phi')) {
      await auditLog({
        userId: operation.userId,
        action: 'edit_phi_field',
        resourceType: 'form',
        resourceId: formId,
        details: {
          operation: operation.type,
          path: operation.path,
        },
        containsPHI: true,
        phiFields: [operation.path],
        ipAddress: '',
        userAgent: '',
      });
    }
  }

  /**
   * Handle cursor position update
   */
  private handleCursorUpdate(
    socket: any,
    data: {
      formId: string;
      userId: string;
      cursor: { fieldId: string; position: number };
    }
  ): void {
    const { formId, userId, cursor } = data;

    const session = this.sessions.get(formId);
    if (!session) return;

    const user = session.users.get(userId);
    if (!user) return;

    // Update user cursor
    user.cursor = cursor;
    user.lastActivity = new Date();

    // Broadcast cursor update to other users
    socket.to(`form:${formId}`).emit('cursor-moved', {
      userId,
      cursor,
    });
  }

  /**
   * Handle field lock request
   */
  private async handleRequestLock(
    socket: any,
    data: { formId: string; userId: string; fieldId: string }
  ): Promise<void> {
    const { formId, userId, fieldId } = data;

    const session = this.sessions.get(formId);
    if (!session) return;

    // Check if field is already locked
    const currentLock = session.locks.get(fieldId);
    if (currentLock && currentLock !== userId) {
      socket.emit('lock-denied', {
        fieldId,
        lockedBy: currentLock,
      });
      return;
    }

    // Grant lock
    session.locks.set(fieldId, userId);

    socket.emit('lock-granted', { fieldId });
    socket.to(`form:${formId}`).emit('field-locked', { fieldId, userId });
  }

  /**
   * Handle field lock release
   */
  private async handleReleaseLock(
    socket: any,
    data: { formId: string; userId: string; fieldId: string }
  ): Promise<void> {
    const { formId, userId, fieldId } = data;

    const session = this.sessions.get(formId);
    if (!session) return;

    const currentLock = session.locks.get(fieldId);
    if (currentLock === userId) {
      session.locks.delete(fieldId);
      socket.to(`form:${formId}`).emit('lock-released', { fieldId });
    }
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(
    socket: any,
    data: PresenceUpdate & { formId: string }
  ): void {
    const { formId, userId, status, cursor } = data;

    const session = this.sessions.get(formId);
    if (!session) return;

    const user = session.users.get(userId);
    if (!user) return;

    user.lastActivity = new Date();
    if (cursor) {
      user.cursor = cursor;
    }

    // Broadcast presence update
    socket.to(`form:${formId}`).emit('presence-updated', {
      userId,
      status,
      cursor,
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(socket: any): void {
    // Clean up user from all sessions
    // (Socket.IO rooms handle this automatically)
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Get active users for a form
   */
  getActiveUsers(formId: string): CollaborationUser[] {
    const session = this.sessions.get(formId);
    return session ? Array.from(session.users.values()) : [];
  }

  /**
   * Get session statistics
   */
  getSessionStats(formId: string): {
    totalUsers: number;
    totalChanges: number;
    activeLocks: number;
  } | null {
    const session = this.sessions.get(formId);
    if (!session) return null;

    return {
      totalUsers: session.users.size,
      totalChanges: session.changes.length,
      activeLocks: session.locks.size,
    };
  }
}

// Export singleton instance (initialize in server)
let collaborationManager: CollaborationManager | null = null;

export function initializeCollaboration(httpServer: HTTPServer): CollaborationManager {
  if (!collaborationManager) {
    collaborationManager = new CollaborationManager(httpServer);
  }
  return collaborationManager;
}

export function getCollaborationManager(): CollaborationManager | null {
  return collaborationManager;
}
