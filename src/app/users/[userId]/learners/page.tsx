// /app/users/[userId]/learners/page.tsx
import UserStatus from '../../../../components/UserStatus';

interface LearnersPageProps {
    params: {
        userId: string;
    };
}

export default function LearnersPage({ params }: LearnersPageProps) {
    return (
        <div className="p-4">
        <UserStatus userId={params.userId} />
    </div>
);
}
