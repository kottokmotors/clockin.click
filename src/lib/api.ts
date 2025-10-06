// /lib/api.ts
export async function fetchUser(userId: string) {
    const res = await fetch(`/api/users/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
}

export async function fetchLearners(userId: string) {
    const res = await fetch(`/api/users/${userId}/learners`);
    if (!res.ok) throw new Error('Failed to fetch learners');
    return res.json();
}
