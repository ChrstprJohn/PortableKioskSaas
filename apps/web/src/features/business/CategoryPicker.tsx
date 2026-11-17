import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, json } from "@/lib/api";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useId, useState } from "react";
export function CategoryPicker({
  categories,
  initial = "Menu",
}: {
  categories: string[];
  initial?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(initial),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api<{ id: string; name: string }[]>("/business/categories")
      .then((rows) => {
        if (alive) setSaved(rows.map((c) => c.name));
      })
      .catch(() => {
        if (alive)
          setError(
            "Saved categories could not load. Existing product categories are still available.",
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const row = await api<{ id: string; name: string }>(
        "/business/categories",
        { method: "POST", body: json({ name: query.trim() }) },
      );
      setSaved((previous) => [...previous, row.name]);
      choose(row.name);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const choices = [...new Set([initial, ...saved, ...categories])];
  const matches = choices.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()),
  );
  function choose(next: string) {
    setValue(next);
    setOpen(false);
    setQuery("");
  }
  return (
    <div className="field">
      <Label htmlFor={id}>Category</Label>
      <input type="hidden" name="category" value={value} />
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="category-picker-trigger"
          >
            {value}
            <ChevronsUpDown size={16} />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="category-picker-popover"
            align="start"
            sideOffset={6}
            aria-label="Choose or create a category"
          >
            <Input
              aria-label="Search or name a category"
              value={query}
              maxLength={60}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find or create a category…"
            />
            <div className="category-options">
              {matches.map((c) => (
                <Button
                  type="button"
                  variant="ghost"
                  key={c}
                  onClick={() => choose(c)}
                >
                  {c}
                  {c === value && <Check size={15} />}
                </Button>
              ))}
            </div>
            {query.trim() &&
              !choices.some(
                (c) => c.toLowerCase() === query.trim().toLowerCase(),
              ) && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={create}
                >
                  <Plus size={15} />
                  Create category “{query.trim()}”
                </Button>
              )}
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
            <p className="hint">
              Choose an existing category or create one here.
            </p>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
