import requireAdmin from "@/utils/auth";
import { getAllUsers } from "@/utils/dynamo";
import AdminUserTable from "@/components/AdminUserTable";

export default async function AdminUsersPage() {
    await requireAdmin();
    const users = await getAllUsers();

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">User Management</h1>
            <AdminUserTable users={users} />
        </div>
    );
}
