// /app/users/[userId]/page.tsx
import UserStatus from '../../../components/UserStatus';

interface UserPageProps {
    params: {
        userId: string;
    };
}

export default function UserPage({ params }: UserPageProps) {
    return (
        <div className="p-4">
        <UserStatus userId={params.userId} />
    </div>
);
}

