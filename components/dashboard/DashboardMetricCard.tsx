import { Card, CardBody } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface DashboardMetricCardProps {
  label: string;
  value: string;
  className?: string;
}

export function DashboardMetricCard({
  label,
  value,
  className,
}: DashboardMetricCardProps) {
  return (
    <Card className={cn(className)}>
      <CardBody>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="mt-1 text-xl font-bold text-navy">{value}</p>
      </CardBody>
    </Card>
  );
}
