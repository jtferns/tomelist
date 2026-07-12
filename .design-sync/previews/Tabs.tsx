import { Tabs, TabsContent, TabsList, TabsTrigger } from "@tomelist/app";

export function Default() {
  return (
    <Tabs defaultValue="objectives" className="w-80">
      <TabsList>
        <TabsTrigger value="objectives">Objectives</TabsTrigger>
        <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="objectives">
        <p className="text-sm text-muted-foreground">
          Clear duties to earn tomestones toward this event's goals.
        </p>
      </TabsContent>
      <TabsContent value="exchanges">
        <p className="text-sm text-muted-foreground">
          Spend earned tomestones on wishlisted rewards.
        </p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm text-muted-foreground">
          Choose a Grand Company palette and light/dark mode.
        </p>
      </TabsContent>
    </Tabs>
  );
}

export function LineVariant() {
  return (
    <Tabs defaultValue="objectives" className="w-80">
      <TabsList variant="line">
        <TabsTrigger value="objectives">Objectives</TabsTrigger>
        <TabsTrigger value="exchanges">Exchanges</TabsTrigger>
      </TabsList>
      <TabsContent value="objectives">
        <p className="text-sm text-muted-foreground">
          Clear duties to earn tomestones toward this event's goals.
        </p>
      </TabsContent>
      <TabsContent value="exchanges">
        <p className="text-sm text-muted-foreground">
          Spend earned tomestones on wishlisted rewards.
        </p>
      </TabsContent>
    </Tabs>
  );
}
