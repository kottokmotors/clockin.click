export interface BaseUser {
    userId: string;
    firstName: string;
    lastName: string;
    roles: string[];
    status?: string;
    pin: string;
    email?: string;
    adminLevel?: string | null;
    lastClockTransaction?: string;
}

// Guardian user (must have learners)
export interface GuardianUser extends BaseUser {
    roles: string[]; // ensures guardian is included
    learners: BaseUser[];             // guardians track learners
}

// Non-guardian user (no learners allowed)
export interface RegularUser extends BaseUser {
    learners?: never;
}

// Final User type
export type User = GuardianUser | RegularUser;

// Type guard helper
export function isGuardian(user: User): user is GuardianUser {
    return user.roles.includes("guardian");
}
