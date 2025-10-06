import { User } from "@/types/user";

export function formatLearners(user: User): string {
    // Optional chaining ensures no crash if user.learners is undefined
    if (user.learners?.length) {
        return user.learners.map(l => `${l.firstName} ${l.lastName}`).join(", ");
    }
    return "-";
}

export function formatFullName(user: User): string {
    return `${user.firstName} ${user.lastName}`.trim();
}

export function formatRoles(user: User): string {
    if (!user.roles?.length) return "-";
    return user.roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", ");
}

export function formatAdminLevel(user: User): string {
    if (!user.adminLevel) return "-";

    switch (user.adminLevel.toLowerCase()) {
        case "read-only":
            return "Read Only";
        case "edit":
            return "Edit";
        default:
            return user.adminLevel;
    }
}




