export const DEFAULT_USER_AVATAR_COUNT = 34;

type RandomSource = () => number;

/** Returns a URL that is guaranteed to exist in the bundled default avatar library. */
export function getDefaultUserAvatar(random: RandomSource = Math.random): string {
    const normalizedRandom = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
    const avatarIndex = Math.floor(normalizedRandom * DEFAULT_USER_AVATAR_COUNT) + 1;
    return `/static/avatars/${avatarIndex}.png`;
}

/** Keeps a supplied custom avatar and only falls back for missing or blank values. */
export function resolveUserAvatar(
    avatar: string | null | undefined,
    random: RandomSource = Math.random,
): string {
    return avatar?.trim() ? avatar : getDefaultUserAvatar(random);
}
