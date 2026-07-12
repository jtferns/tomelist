import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  WalletStepper,
} from "@tomelist/app";

export function WalletCard() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle className="text-center text-sm text-muted-foreground">
          Allagan Tomestones of Comedy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WalletStepper eventId="preview-event" />
      </CardContent>
    </Card>
  );
}

export function ExchangeRow() {
  return (
    <Card className="max-w-sm border-primary">
      <CardContent className="flex items-center gap-3 p-3">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-medium">Ehcatl Nine Zonureskin Coat</span>
          <div className="flex gap-1">
            <Badge variant="secondary">120 tomes</Badge>
            <Badge variant="outline">tradeable</Badge>
          </div>
        </div>
        <Button variant="outline" size="sm" aria-label="Fewer">
          −
        </Button>
        <span className="text-sm tabular-nums">1</span>
        <Button variant="outline" size="sm" aria-label="More">
          +
        </Button>
      </CardContent>
    </Card>
  );
}

export function ExchangedRow() {
  return (
    <Card className="max-w-sm opacity-70">
      <CardContent className="flex items-center gap-3 p-3">
        <span className="flex-1 text-sm font-medium">Ehcatl Nine Zonureskin Coat</span>
        <Badge>Exchanged</Badge>
      </CardContent>
    </Card>
  );
}

export function FullComposition() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Grade 8 Glamour Prism</CardTitle>
        <CardDescription>Exchange for tradeable materia</CardDescription>
        <CardAction>
          <Badge variant="secondary">400 tomes</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Grants a single-use glamour prism, tradeable on the market board.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Mark exchanged</Button>
      </CardFooter>
    </Card>
  );
}
