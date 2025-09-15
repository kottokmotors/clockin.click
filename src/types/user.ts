export interface User {
    userId: string;
    firstName: string;
    lastName: string;
    roles: string[];
    status?: string;
    learners?: Pick<User, "userId" | "firstName" | "lastName" | "status">[];
    pin?: string;
    email?: string;
    adminLevel?: string;
    lastClockTransaction?: string;
}
