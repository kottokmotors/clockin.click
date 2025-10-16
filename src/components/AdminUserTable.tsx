"use client";

import { useState, useEffect, useMemo, useRef, RefObject } from "react";
import {RegularUser, User} from "@/types/user";
import {
    formatFullName,
    formatRoles,
    formatLearners,
    formatAdminLevel,
} from "@/utils/formatters";
import Dropdown from "@/components/Dropdown";
import Select, {MultiValue} from "react-select";
import {Transition} from "@headlessui/react"
import { FaEdit, FaTrash } from "react-icons/fa";
import {Spinner} from "@/components/Spinner";
import { useSession } from "next-auth/react";

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
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [pin, setPin] = useState("");
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedAdminLevel, setSelectedAdminLevel] = useState<string | null>(null);
    const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
    const [isNewUser, setIsNewUser] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({key: "name", direction: "asc"});
    const [searchQuery, setSearchQuery] = useState("");
    const { data: session } = useSession();
    const canEdit = session ? session.user.adminLevel === "edit" : false;


    // --- Populate state when user changes ---
    useEffect(() => {
        if (!selectedUser) return;
        setFirstName(selectedUser.firstName);
        setLastName(selectedUser.lastName);
        setEmail(selectedUser.email ?? "");
        setPin(selectedUser.pin);
        setSelectedAdminLevel(selectedUser.adminLevel ?? null);
        setSelectedRoles(selectedUser.roles ?? []);
        setSelectedLearners(selectedUser.learners?.map((l) => l.userId) ?? []);
    }, [selectedUser]);

    const roleFilterButtonRef = useRef<HTMLButtonElement>(null);

    // Initialize users & role filter
    useEffect(() => {
        setAllUsers(users);

        const roles: Record<string, boolean> = {};
        users.forEach((u) => u.roles.forEach((r) => (roles[r] = true)));
        setRoleFilter(roles);
    }, [users]);

    useEffect(() => {
        if (sortConfig) {
            setAllUsers((prev) => sortUsers(prev, sortConfig));
        }
    }, [users]); // Re-run when new users prop comes in


    const handleSort = (key: string) => {
        setSortConfig((prev) => {
            if (prev && prev.key === key) {
                // Toggle direction if same key is clicked
                return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
            }
            // Default to ascending
            return { key, direction: "asc" };
        });
    };

    const sortUsers = (users: User[], config: typeof sortConfig): User[] => {
        if (!config) return users;

        return [...users].sort((a, b) => {
            let aValue: string | number = "";
            let bValue: string | number = "";

            switch (config.key) {
                case "name":
                    aValue = `${a.lastName ?? ""} ${a.firstName ?? ""}`.toLowerCase();
                    bValue = `${b.lastName ?? ""} ${b.firstName ?? ""}`.toLowerCase();
                    break;
                case "email":
                    aValue = (a.email ?? "").toLowerCase();
                    bValue = (b.email ?? "").toLowerCase();
                    break;
                case "pin":
                    aValue = a.pin ?? "";
                    bValue = b.pin ?? "";
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return config.direction === "asc" ? -1 : 1;
            if (aValue > bValue) return config.direction === "asc" ? 1 : -1;
            return 0;
        });
    };


    // Filter users based on selected roles
    const filteredUsers = useMemo(() => {
        const activeRoles = Object.entries(roleFilter)
            .filter(([_, checked]) => checked)
            .map(([role]) => role);

        let result = allUsers.filter((u) => u.roles.some((r) => activeRoles.includes(r)));

        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            result = result.filter((u) =>
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
                (u.email?.toLowerCase() ?? "").includes(query) ||
                (u.pin ?? "").includes(query) ||
                u.roles.some((r) => r.toLowerCase().includes(query))
            );
        }

        result = sortUsers(result, sortConfig);

        return result;
    }, [allUsers, roleFilter, sortConfig, searchQuery]);




    const showToast = (type: Toast["type"], message: string) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };

    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsNewUser(false);
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

    // Open modal
    const handleDeleteClick = (user: User) => {
        setUserToDelete(user);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;

        try {
            const userId = userToDelete.userId;
            // Delete the user
            const res = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete user");

            // Remove the user from local state
            setAllUsers((prevUsers) => {
                const userToDelete = prevUsers.find((u) => u.userId === userId);

                if (!userToDelete) return prevUsers;

                // Clean up guardian references if the deleted user is a learner
                const updatedUsers = prevUsers.map((u) => {
                    if (u.roles.includes("guardian") && u.learners?.length) {
                        const newLearners = u.learners.filter(
                            (l) => l.userId !== userId
                        );
                        return { ...u, learners: newLearners };
                    }
                    return u;
                });

                // Finally, remove the deleted user from the list
                return updatedUsers.filter((u) => u.userId !== userId);
            });

            showToast("success", "User deleted successfully!");
        } catch (err) {
            console.error("Failed to delete user:", err);
            showToast("error", "Failed to delete user. Please try again.");
        } finally {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
        }
    };

    const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsSaving(true);

        // Determine if user is a guardian
        const isGuardian = selectedRoles.includes("guardian");

        // Build updated user object with correct type
        const updatedUser: User = isGuardian
            ? {
                userId: selectedUser.userId,
                firstName,
                lastName,
                email,
                pin,
                adminLevel: selectedAdminLevel,
                roles: selectedRoles.includes("guardian") ? selectedRoles : [...selectedRoles, "guardian"],
                learners: allUsers.filter((u) => selectedLearners.includes(u.userId)),
            }
            : {
                userId: selectedUser.userId,
                firstName,
                lastName,
                email,
                pin,
                adminLevel: selectedAdminLevel,
                roles: selectedRoles,
                // learners must be omitted for RegularUser
            };

        try {
            const url = isNewUser ? `/api/users` : `/api/users/${selectedUser.userId}`;
            const method = isNewUser ? "POST" : "PATCH"; // your API uses PATCH for both
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedUser),
            });

            if (!res.ok) throw new Error("Failed to save user");

            const data = await res.json();
            console.log(data)

            if (data.success && data.user) {
                setAllUsers((prev) =>
                    prev.some((u) => u.userId === data.user!.userId)
                        ? prev.map((u) => (u.userId === data.user!.userId ? data.user! : u))
                        : [...prev, data.user!]
                );

                showToast("success", `User ${isNewUser ? "added" : "updated"} successfully!`);
                setIsModalOpen(false);
                setSelectedUser(null);
            } else {
                showToast("error", "Failed to save user");
            }
        } catch (err) {
            console.error("Error saving user:", err);
            showToast("error", "Error saving user. Please try again.");
        }
        setIsSaving(false);
    };

    const handleAddUser = () => {
        // Decide initial type: RegularUser by default
        const newUser: RegularUser = {
            userId: crypto.randomUUID(), // generate temporary unique ID
            firstName: "",
            lastName: "",
            email: "",
            pin: "",
            adminLevel: null,
            roles: [],       // empty roles for now
            // learners omitted for RegularUser
        };

        setSelectedUser(newUser);
        setIsNewUser(true);
        setIsModalOpen(true);

        // Reset state fields for form
        setFirstName("");
        setLastName("");
        setEmail("");
        setPin("");
        setSelectedAdminLevel(null);
        setSelectedRoles([]);
        setSelectedLearners([]);
    };



    const availableRoles = [
        'staff',
        'administrator',
        'learner',
        'volunteer',
        'guardian',
    ];

    const roleOptions = availableRoles.map((role) => ({ value: role, label: role }));

    const isPinValid = /^\d{4}$/.test(pin);
    const isNameValid = firstName.trim() !== "" && lastName.trim() !== "";
    const isRolesValid = selectedRoles.length > 0;

    const isFormValid = isPinValid && isNameValid && isRolesValid;

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

            <div className="flex items-center justify-between mb-4">
                {canEdit &&
                <button
                    onClick={handleAddUser}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
                >
                    Add New User
                </button>
                }

                <div className="relative w-64">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 pr-9 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                    />

                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="absolute inset-y-0 right-2 flex items-center justify-center w-5 h-5 my-auto rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition"
                        >
                            ×
                        </button>
                    )}
                </div>

            </div>


            {/* User Table */}
            <div className="overflow-hidden rounded-2xl shadow-md bg-white border border-gray-200">
                <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-sm tracking-wide">
                    <tr>
                        <th
                            onClick={() => handleSort("name")}
                            className={`px-6 py-3 text-left font-semibold cursor-pointer select-none ${
                                sortConfig?.key === "name" ? "text-blue-600" : ""
                            }`}
                        >
                            Full Name
                            {sortConfig?.key === "name" && (
                                <span className="ml-1">{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
                            )}
                        </th>
                        <th
                            onClick={() => handleSort("email")}
                            className={`px-6 py-3 text-left font-semibold cursor-pointer select-none ${
                                sortConfig?.key === "email" ? "text-blue-600" : ""
                            }`}
                        >
                            Email
                            {sortConfig?.key === "email" && (
                                <span className="ml-1">{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
                            )}
                        </th>
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
                        {canEdit && <th className="px-6 py-3 text-left font-semibold">Actions</th>}
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
                            {canEdit &&
                            <td className="px-6 py-3">
                                <div className="flex gap-2">
                                    {/* Edit Button */}
                                    <button
                                        onClick={() => handleEditClick(u)}
                                        className="p-2 text-blue-600 hover:text-blue-800 rounded transition cursor-pointer"
                                        title="Edit User"
                                    >
                                        <FaEdit />
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDeleteClick(u)}
                                        className="p-2 text-red-600 hover:text-red-800 rounded transition cursor-pointer"
                                        title="Delete User"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </td>
                            }
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
                            {isNewUser
                                ? "Add User"
                                : `Edit User: ${formatFullName(selectedUser)}`}
                        </h2>

                        <form onSubmit={handleSaveUser} className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    defaultValue={firstName}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    defaultValue={lastName}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                />
                            </div>

                            {!isNameValid && (
                                <p className="text-sm text-red-600 mt-1">First and last name are required.</p>
                            )}

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={email}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            {/* PIN */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">PIN</label>
                                <input
                                    type="text"
                                    name="pin"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, ""); // remove non-digits
                                        if (value.length <= 4) setPin(value);
                                    }}
                                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    required
                                />
                            </div>

                            {!isPinValid && pin.length >= 0 && (
                                <p className="text-sm text-red-600 mt-1">PIN must be exactly 4 digits.</p>
                            )}

                            {/* Roles */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
                                <Select
                                    isMulti
                                    options={roleOptions}
                                    value={roleOptions.filter((r) => selectedRoles.includes(r.value))}
                                    onChange={(options: MultiValue<{ value: string; label: string }>) =>
                                        setSelectedRoles(options.map((o) => o.value))
                                    }
                                    className="react-select-container mt-1"
                                    classNamePrefix="react-select"
                                />
                            </div>

                            {!isRolesValid && (
                                <p className="text-sm text-red-600 mt-1">Select at least one role.</p>
                            )}

                            {/* Admin Level Dropdown (only visible for administrators) */}
                            <Transition
                                show={selectedRoles.includes("administrator")}
                                enter="transition-opacity duration-150"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="transition-opacity duration-150"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Admin Level</label>
                                    <Select
                                        options={[
                                            { value: null, label: "None" },
                                            { value: "read-only", label: "Read-Only" },
                                            { value: "edit", label: "Edit" },
                                        ]}
                                        isClearable
                                        value={
                                            selectedAdminLevel
                                                ? {
                                                    value: selectedAdminLevel,
                                                    label:
                                                        selectedAdminLevel === "edit"
                                                            ? "Edit"
                                                            : selectedAdminLevel === "read-only"
                                                                ? "Read-Only"
                                                                : "None",
                                                }
                                                : { value: null, label: "None" }
                                        }
                                        onChange={(option) => setSelectedAdminLevel(option?.value ?? null)}
                                        className="react-select-container"
                                        classNamePrefix="react-select"
                                        placeholder="Select level..."
                                    />
                                </div>
                            </Transition>

                            {/* Learners Multiselect */}
                            <Transition
                                show={selectedRoles.includes("guardian")}
                                enter="transition-opacity duration-150"
                                enterFrom="opacity-0"
                                enterTo="opacity-100"
                                leave="transition-opacity duration-150"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Learners</label>
                                    <Select
                                        isMulti
                                        options={allUsers
                                            .filter((u) => u.roles.includes("learner"))
                                            .map((learner) => ({
                                                value: learner.userId,
                                                label: formatFullName(learner),
                                            }))}
                                        value={allUsers
                                            .filter((u) => selectedLearners.includes(u.userId))
                                            .map((learner) => ({
                                                value: learner.userId,
                                                label: formatFullName(learner),
                                            }))}
                                        onChange={(options) => setSelectedLearners(options.map((o) => o.value))}
                                    />
                                </div>
                            </Transition>

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
                                    disabled={!isFormValid}
                                    className={`px-4 py-2 rounded-lg text-white transition-colors
                                        ${isFormValid ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}
                                      `}
                                >
                                    {isSaving ? <Spinner/> : (isNewUser ? "Add User" : "Save Changes")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && userToDelete && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">
                            Confirm Delete
                        </h2>
                        <p className="mb-6 text-gray-700">
                            Are you sure you want to delete {formatFullName(userToDelete)}? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                                onClick={() => {
                                    setIsDeleteModalOpen(false);
                                    setUserToDelete(null);
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                                onClick={handleDeleteUser}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
