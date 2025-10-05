"use client";

import { useState, useEffect, useMemo, useRef, RefObject } from "react";
import { User } from "@/types/user";
import {
    formatFullName,
    formatRoles,
    formatLearners,
    formatAdminLevel,
} from "@/utils/formatters";
import Dropdown from "@/components/Dropdown";

interface Props {
    users: User[];
}

interface Toast {
    id: number;
    type: "success" | "error";
    message: string;
}

export default function AdminUserTable({ users }: Props) {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [roleFilter, setRoleFilter] = useState<Record<string, boolean>>({});
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const roleFilterButtonRef = useRef<HTMLButtonElement>(null);

    // Initialize users & role filter
    useEffect(() => {
        setAllUsers(users);

        const roles: Record<string, boolean> = {};
        users.forEach((u) => u.roles.forEach((r) => (roles[r] = true)));
        setRoleFilter(roles);
    }, [users]);

    // Filter users based on selected roles
    const filteredUsers = useMemo(() => {
        const activeRoles = Object.entries(roleFilter)
            .filter(([_, checked]) => checked)
            .map(([role]) => role);

        return allUsers.filter((u) => u.roles.some((r) => activeRoles.includes(r)));
    }, [allUsers, roleFilter]);

    const showToast = (type: Toast["type"], message: string) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedUser(null);
        setIsModalOpen(false);
    };

    const handleRoleToggle = (role: string) => {
        setRoleFilter((prev) => ({ ...prev, [role]: !prev[role] }));
    };

    const handleSelectAll = () => {
        const newFilter: Record<string, boolean> = {};
        Object.keys(roleFilter).forEach((role) => (newFilter[role] = true));
        setRoleFilter(newFilter);
    };

    const handleDeselectAll = () => {
        const newFilter: Record<string, boolean> = {};
        Object.keys(roleFilter).forEach((role) => (newFilter[role] = false));
        setRoleFilter(newFilter);
    };

    const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedUser) return;

        const formData = new FormData(e.currentTarget);

        // Collect updated roles
        const updatedRoles = availableRoles.filter(
            (role) => formData.get(`role-${role}`) === "on"
        );

        // Collect updated learners (assuming learners are users with role "learner")
        const updatedLearners = allUsers
            .filter((u) => u.roles.includes("learner"))
            .filter((learner) => formData.get(`learner-${learner.userId}`) === "on")
            .map((l) => l.userId);

        // Build updated user object
        const updatedUser = {
            ...selectedUser,
            firstName: formData.get("firstName") as string,
            lastName: formData.get("lastName") as string,
            email: formData.get("email") as string,
            pin: formData.get("pin") as string,
            adminLevel: Number(formData.get("adminLevel")),
            roles: updatedRoles,
            learners: updatedLearners,
        };

        try {
            const res = await fetch(`/api/users/${selectedUser.userId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedUser),
            });

            if (!res.ok) throw new Error("Failed to update user");

            const data = await res.json();

            if (data.success && data.user) {
                // Update local state immediately
                setAllUsers((prev) =>
                    prev.map((u) => (u.userId === data.user!.userId ? data.user! : u))
                );
                showToast("success", "User updated successfully!");
                setIsModalOpen(false);
                setSelectedUser(null);
            } else {
                alert("Failed to update user");
            }
        } catch (err) {
            console.error("Failed to save user:", err);
            showToast("error", "Error updating user. Please try again.");
        }
    };


    const availableRoles = [
        'staff',
        'administrator',
        'learner',
        'volunteer',
        'guardian',
    ];

    return (
        <div className="relative">
            {/* Toasts */}
            <div className="fixed top-6 right-6 space-y-3 z-50">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`px-4 py-2 rounded-lg shadow-md text-white font-medium transition-transform ${
                            toast.type === "success"
                                ? "bg-green-600 animate-slide-in"
                                : "bg-red-600 animate-slide-in"
                        }`}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* User Table */}
            <div className="overflow-hidden rounded-2xl shadow-md bg-white border border-gray-200">
                <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-sm tracking-wide">
                    <tr>
                        <th className="px-6 py-3 text-left font-semibold">Full Name</th>
                        <th className="px-6 py-3 text-left font-semibold">Email</th>
                        <th className="px-6 py-3 text-left font-semibold relative">
                            Roles
                            <button
                                ref={roleFilterButtonRef}
                                onClick={() => setIsDropdownOpen((prev) => !prev)}
                                className="ml-2 text-gray-500 hover:text-gray-700"
                            >
                                &#x25BC;
                            </button>

                            {isDropdownOpen && (
                                <Dropdown
                                    isOpen={isDropdownOpen}
                                    onClose={() => setIsDropdownOpen(false)}
                                    triggerRef={roleFilterButtonRef as RefObject<HTMLElement>}
                                    offsetY={4}
                                    className="w-44"
                                >
                                    <div className="flex justify-between mb-2 text-sm">
                                        <button
                                            type="button"
                                            className="text-blue-600 hover:underline"
                                            onClick={handleSelectAll}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            className="text-blue-600 hover:underline"
                                            onClick={handleDeselectAll}
                                        >
                                            Deselect All
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                                        {availableRoles.map((role) => (
                                            <label key={role} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={roleFilter[role]}
                                                    onChange={() => handleRoleToggle(role)}
                                                />
                                                {role}
                                            </label>
                                        ))}
                                    </div>
                                </Dropdown>
                            )}
                        </th>
                        <th className="px-6 py-3 text-left font-semibold">PIN</th>
                        <th className="px-6 py-3 text-left font-semibold">Admin Level</th>
                        <th className="px-6 py-3 text-left font-semibold">Learners</th>
                        <th className="px-6 py-3 text-left font-semibold">Actions</th>
                    </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 text-gray-800">
                    {filteredUsers.map((u, i) => (
                        <tr
                            key={u.userId}
                            className={`transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`}
                        >
                            <td className="px-6 py-3">{formatFullName(u)}</td>
                            <td className="px-6 py-3">{u.email ?? "-"}</td>
                            <td className="px-6 py-3">{formatRoles(u)}</td>
                            <td className="px-6 py-3 font-mono text-gray-600">{u.pin ?? "-"}</td>
                            <td className="px-6 py-3">{formatAdminLevel(u)}</td>
                            <td className="px-6 py-3">{formatLearners(u)}</td>
                            <td className="px-6 py-3 text-right">
                                <button
                                    onClick={() => handleEditClick(u)}
                                    className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                                >
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">
                            Edit User: {formatFullName(selectedUser)}
                        </h2>

                        <form onSubmit={handleSaveUser} className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    defaultValue={selectedUser.firstName}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    defaultValue={selectedUser.lastName}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    defaultValue={selectedUser.email}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* PIN */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">PIN</label>
                                <input
                                    type="text"
                                    name="pin"
                                    maxLength={4}
                                    defaultValue={selectedUser.pin ?? ""}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Admin Level */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Admin Level</label>
                                <input
                                    type="number"
                                    name="adminLevel"
                                    min={0}
                                    max={10}
                                    defaultValue={selectedUser.adminLevel ?? 0}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Roles */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableRoles.map((role) => (
                                        <label key={role} className="flex items-center gap-1">
                                            <input
                                                type="checkbox"
                                                name={`role-${role}`}
                                                defaultChecked={selectedUser.roles.includes(role)}
                                            />
                                            {role}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Learners */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Learners</label>
                                <div className="flex flex-wrap gap-2">
                                    {allUsers
                                        .filter((u) => u.roles.includes("learner")) // if learners are marked with a role
                                        .map((learner) => (
                                            <label key={learner.userId} className="flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    name={`learner-${learner.userId}`}
                                                    // Use optional chaining and default to empty array
                                                    defaultChecked={selectedUser?.learners?.some((l) => l.userId === learner.userId) ?? false}
                                                />
                                                {formatFullName(learner)}
                                            </label>
                                        ))}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
