import { TaskStatus, getStatusColor } from '@/lib/mockData';

export default function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
