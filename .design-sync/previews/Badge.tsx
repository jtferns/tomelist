import { Badge } from "@tomelist/app";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>Exchanged</Badge>
      <Badge variant="secondary">80 tomes</Badge>
      <Badge variant="outline">tradeable</Badge>
      <Badge variant="destructive">error</Badge>
    </div>
  );
}

export function ObjectiveRow() {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-3">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium">Clear The Slice of Life</span>
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          <Badge variant="secondary">40 tomes</Badge>
          <Badge variant="outline">daily</Badge>
        </div>
      </div>
    </div>
  );
}

export function ExchangeTags() {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary">120 tomes</Badge>
      <Badge variant="outline">tradeable</Badge>
    </div>
  );
}
