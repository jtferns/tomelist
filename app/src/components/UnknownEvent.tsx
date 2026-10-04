import { Link } from "@tanstack/react-router";

export function UnknownEvent({ testId }: { testId: string }) {
  return (
    <div data-testid={testId} className="py-10 text-center text-sm text-muted-foreground">
      <p>This event isn't in Tomelist.</p>
      <Link to="/" className="text-gold underline underline-offset-2">
        Go to the current event
      </Link>
    </div>
  );
}
