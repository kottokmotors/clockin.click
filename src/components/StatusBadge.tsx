// /components/StatusBadge.tsx
interface StatusBadgeProps {
    status?: string; // can be "In", "Out", or undefined
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    let bgColor = "bg-gray-300";
    let textColor = "text-gray-700";

    if (status === "In") {
        bgColor = "bg-green-100";
        textColor = "text-green-800";
    } else if (status === "Out") {
        bgColor = "bg-red-100";
        textColor = "text-red-800";
    }

    return (
        <span className={`px-2 py-1 rounded-full text-sm font-semibold ${bgColor} ${textColor}`}>
      {status || "N/A"}
    </span>
    );
}
