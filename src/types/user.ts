export interface User {
    userId: string;
    firstName: string;
    lastName: string;
    roles: string[];
    status?: string;
    learners?: User[];
    pin?: string;
    email?: string;
    adminLevel?: string;
    lastClockTransaction?: string;
}
