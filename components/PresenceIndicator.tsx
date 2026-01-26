'use client';

import { Users, Circle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import type { CollaborationUser } from '@/lib/collaboration';

interface PresenceIndicatorProps {
  users: CollaborationUser[];
  currentUserId: string;
  maxAvatars?: number;
}

/**
 * Presence Indicator Component
 * Shows avatars of users currently editing the form
 */
export function PresenceIndicator({
  users,
  currentUserId,
  maxAvatars = 5,
}: PresenceIndicatorProps) {
  const otherUsers = users.filter(u => u.userId !== currentUserId);
  const visibleUsers = otherUsers.slice(0, maxAvatars);
  const hiddenCount = Math.max(0, otherUsers.length - maxAvatars);

  if (otherUsers.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>Only you</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <Avatar
                  className="border-2 border-background cursor-pointer hover:z-10 transition-transform hover:scale-110"
                  style={{ borderColor: user.color }}
                >
                  <AvatarFallback
                    style={{ backgroundColor: user.color }}
                    className="text-white text-xs font-semibold"
                  >
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <Circle
                    className="h-2 w-2 fill-green-500 text-green-500"
                  />
                  <span className="font-medium">{user.name}</span>
                </div>
                {user.cursor && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Editing: {user.cursor.fieldId}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          ))}

          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="border-2 border-background cursor-pointer">
                  <AvatarFallback className="bg-muted text-xs font-semibold">
                    +{hiddenCount}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {otherUsers.slice(maxAvatars).map((user) => (
                    <div key={user.userId} className="flex items-center gap-2">
                      <Circle
                        className="h-2 w-2 fill-green-500 text-green-500"
                      />
                      <span className="text-sm">{user.name}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <span className="text-sm text-muted-foreground">
          {otherUsers.length} {otherUsers.length === 1 ? 'person' : 'people'} editing
        </span>
      </div>
    </TooltipProvider>
  );
}

/**
 * Field Lock Indicator
 * Shows who has locked a specific field
 */
export function FieldLockIndicator({
  lockedBy,
  users,
}: {
  lockedBy?: string;
  users: CollaborationUser[];
}) {
  if (!lockedBy) return null;

  const user = users.find(u => u.userId === lockedBy);
  if (!user) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="cursor-help"
            style={{
              backgroundColor: `${user.color}20`,
              borderColor: user.color,
            }}
          >
            <Circle
              className="h-2 w-2 mr-1 fill-current"
              style={{ color: user.color }}
            />
            Locked by {user.name}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{user.name} is currently editing this field</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Cursor Indicator
 * Shows remote cursors in collaborative editing
 */
export function CursorIndicator({
  user,
  top,
  left,
}: {
  user: CollaborationUser;
  top: number;
  left: number;
}) {
  return (
    <div
      className="absolute pointer-events-none z-50"
      style={{ top, left }}
    >
      <div
        className="w-0.5 h-5 animate-pulse"
        style={{ backgroundColor: user.color }}
      />
      <div
        className="mt-1 px-2 py-0.5 rounded text-white text-xs font-medium whitespace-nowrap"
        style={{ backgroundColor: user.color }}
      >
        {user.name}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}
