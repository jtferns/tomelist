import { collectKindSchema } from "@tomelist/schema";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionKicker } from "@/components/ui/section-header";
import { CollectError, fetchOwned, parseCharacterId, type CollectErrorReason } from "@/lib/collect";
import { useCollectStore } from "@/store/useCollectStore";

const failureText: Record<CollectErrorReason, string> = {
  "not-found": "FFXIV Collect doesn't know this character yet. Look it up once on ffxivcollect.com, then try again.",
  private: "This character's collection is private on FFXIV Collect.",
  unavailable: "FFXIV Collect isn't responding. Try again later.",
};

export function CharacterImport() {
  const imported = useCollectStore((s) => s.imported);
  const setImported = useCollectStore((s) => s.setImported);
  const forget = useCollectStore((s) => s.forget);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (characterId: string) => {
    setBusy(true);
    setMessage(null);
    try {
      setImported(await fetchOwned(characterId, collectKindSchema.options));
    } catch (error) {
      setMessage(failureText[error instanceof CollectError ? error.reason : "unavailable"]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <SectionKicker as="h2">Character</SectionKicker>
      {imported ? (
        <>
          <p className="text-sm text-muted-foreground">
            {imported.name} ({imported.server}), imported{" "}
            {new Date(imported.fetchedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.
            Rewards your character already has are marked Owned on Exchanges.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => void run(imported.characterId)}>
              {busy ? "Refreshing…" : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={forget}>
              Forget
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Optional. Mark the mounts, minions and other rewards you already own, using FFXIV Collect.
          </p>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const id = parseCharacterId(input);
              if (!id) return setMessage("That isn't a Lodestone character ID or profile link.");
              void run(id);
            }}
          >
            <label className="sr-only" htmlFor="character-id">
              Lodestone character ID or profile link
            </label>
            <input
              id="character-id"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Lodestone ID or profile link"
              inputMode="url"
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
            />
            <Button type="submit" variant="outline" size="sm" disabled={busy}>
              {busy ? "Importing…" : "Import"}
            </Button>
          </form>
        </>
      )}
      {message ? (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
}
