import { Button } from "@tomelist/app";
import { RotateCcw } from "lucide-react";

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button>Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="link">Link</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm">Did it</Button>
      <Button size="default">Did it</Button>
      <Button size="lg">Did it</Button>
      <Button size="icon" variant="ghost" aria-label="Undo">
        <RotateCcw className="size-4" />
      </Button>
    </div>
  );
}

export function QuantityStepper() {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" aria-label="Fewer">
        −
      </Button>
      <span className="text-sm tabular-nums">3</span>
      <Button variant="outline" size="sm" aria-label="More">
        +
      </Button>
      <Button size="sm">Mark exchanged</Button>
    </div>
  );
}

export function ToggleSelection() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="default">Maelstrom</Button>
      <Button variant="outline">Order of the Twin Adder</Button>
      <Button variant="outline">Immortal Flames</Button>
    </div>
  );
}
