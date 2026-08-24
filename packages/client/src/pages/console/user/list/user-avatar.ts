export const DEFAULT_USER_AVATAR_COUNT = 34;

const SYSTEM_AVATAR_PATTERN = /\/static\/avatars\/(?:[1-9]|[12]\d|3[0-4])\.png(?:\?.*)?$/;

function hashUserIdentity(identity: string): number {
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index += 1) {
    hash ^= identity.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Provides a stable visual identity for historical users that have no stored avatar. */
export function resolveUserListAvatar(avatar: string | null | undefined, identity: string): string {
  const normalizedAvatar = avatar?.trim();
  if (normalizedAvatar && !SYSTEM_AVATAR_PATTERN.test(normalizedAvatar)) return normalizedAvatar;
  const avatarIndex = (hashUserIdentity(identity) % DEFAULT_USER_AVATAR_COUNT) + 1;
  if (!normalizedAvatar) return `/static/avatars/${avatarIndex}.png`;
  return normalizedAvatar.replace(SYSTEM_AVATAR_PATTERN, `/static/avatars/${avatarIndex}.png`);
}
