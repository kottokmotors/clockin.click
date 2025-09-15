export interface User {
    userId: string;
    firstName: string;
    lastName: string;
    roles: string[];
    status?: string;
    learners?: string[];
    pin?: string;
    email?: string;
    adminLevel?: string;
    lastClockTransaction?: string;
}
