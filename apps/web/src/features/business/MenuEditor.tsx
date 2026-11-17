import { ProductImage } from "@/components/ProductImage";
import { ProductImageField, type ImageUpload } from "./ProductImageField";
import {
  Empty,
  ErrorMessage,
  Field,
  Heading,
  Loading,
  Status,
  TextLink,
} from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  centavos,
  json,
  money,
  type Business,
  type MenuItem,
} from "@/lib/api";
import { ArrowLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CategoryPicker } from "./CategoryPicker";

export function MenuEditor({ business }: { business: Business }) {
  const [items, setItems] = useState<MenuItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<MenuItem | null | undefined>(undefined),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState("");
  const [pendingImage, setPendingImage] = useState<
    ImageUpload | null | undefined
  >(undefined);
  const savedProduct = useRef<MenuItem | null>(null);
  useEffect(() => {
    setPendingImage(undefined);
    savedProduct.current = editing ?? null;
  }, [editing]);
  function load() {
    setLoading(true);
    setError("");
    api<MenuItem[]>("/business/menu")
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const body = {
        name: String(form.get("name")),
        category: String(form.get("category")),
        description: String(form.get("description")),
        price_centavos: centavos(String(form.get("price"))),
        available: form.get("available") === "on",
      };
      const target = savedProduct.current;
      const saved = await api<MenuItem>(
        `/business/menu${target ? `/${target.id}` : ""}`,
        {
          method: target ? "PUT" : "POST",
          body: json(body),
        },
      );
      savedProduct.current = saved;
      if (pendingImage !== undefined) {
        if (pendingImage)
          await api(`/business/menu/${saved.id}/image`, {
            method: "POST",
            body: json(pendingImage),
          });
        else
          await api(`/business/menu/${saved.id}/image`, { method: "DELETE" });
      }
      setEditing(undefined);
      toast.success(editing ? "Menu item updated" : "Menu item added");
      load();
    } catch (e) {
      setError(
        (e as Error).message +
          (savedProduct.current && pendingImage !== undefined
            ? " Product details are saved. Your photo change is still selected; save again to retry."
            : ""),
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: MenuItem) {
    setBusy(true);
    try {
      await api(`/business/menu/${item.id}`, { method: "DELETE" });
      setItems((rows) => rows.filter((i) => i.id !== item.id));
      toast.success("Menu item removed. Existing orders keep their details.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (editing !== undefined)
    return (
      <>
        <Button
          variant="ghost"
          onClick={() => {
            setEditing(undefined);
            setError("");
          }}
        >
          <ArrowLeft />
          Back to menu
        </Button>
        <Heading
          title={editing ? "Edit menu item" : "Add a menu item"}
          description="Clear names and accurate prices make ordering easier."
        />
        <form
          key={editing?.id || "new"}
          method="post"
          onSubmit={save}
          className="form-panel max-w-2xl"
          aria-label="Menu item"
        >
          <Field
            label="Item name"
            name="name"
            defaultValue={editing?.name}
            required
            maxLength={100}
          />
          <CategoryPicker
            key={editing?.id || "new"}
            initial={editing?.category || "Menu"}
            categories={items.map((item) => item.category)}
          />
          <div className="field">
            <Label htmlFor="item-description">Description</Label>
            <Textarea
              id="item-description"
              name="description"
              defaultValue={editing?.description}
              maxLength={500}
              placeholder="What should your customer know?"
            />
          </div>
          <Field
            label="Price (PHP)"
            name="price"
            type="text"
            inputMode="decimal"
            defaultValue={
              editing ? (editing.price_centavos / 100).toFixed(2) : ""
            }
            pattern="[0-9]+(\.[0-9]{1,2})?"
            required
            placeholder="0.00"
          />
          <ProductImageField
            key={editing?.id || "new-photo"}
            existing={editing?.image_url}
            name={editing?.name || "New product"}
            onChange={setPendingImage}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              name="available"
              defaultChecked={editing?.available ?? true}
            />
            Available for ordering
          </label>
          <ErrorMessage message={error} />
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(undefined);
                setError("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save item" : "Add item"}
            </Button>
          </div>
        </form>
      </>
    );
  const filtered = items.filter((i) =>
    `${i.name} ${i.category}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="Kiosk menu"
        description="One menu for your customers and your counter."
      >
        <Button
          onClick={() => {
            setError("");
            setEditing(null);
          }}
        >
          <Plus />
          Add menu item
        </Button>
      </Heading>
      <div className="menu-publish-line">
        <div>
          <Status value={business.published ? "published" : "draft"} />
          <span>
            {business.published
              ? "Menu changes appear on your live kiosk."
              : "Your menu is private until you publish it."}
          </span>
        </div>
        <TextLink href={`/k/${business.slug}`}>Open kiosk</TextLink>
      </div>
      <div className="list-toolbar">
        <search className="search-field">
          <Search size={16} />
          <Input
            aria-label="Search menu"
            type="search"
            placeholder="Search items or categories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </search>
        <span>
          {items.filter((i) => i.available).length} available · {items.length}{" "}
          total
        </span>
      </div>
      <ErrorMessage message={error} />
      {error && (
        <Button variant="outline" onClick={load}>
          Retry
        </Button>
      )}
      {loading ? (
        <Loading />
      ) : !filtered.length ? (
        <Empty
          title={
            items.length ? "No matching menu items" : "What’s on the menu?"
          }
        >
          {items.length
            ? "Try another item name or category."
            : "Add your first item, set its price, and get ready to share your kiosk."}
        </Empty>
      ) : (
        <div className="menu-list">
          {[...new Set(filtered.map((i) => i.category))].map((category) => (
            <section key={category}>
              <div className="category-heading">
                <h2>{category}</h2>
                <span>
                  {filtered.filter((i) => i.category === category).length} items
                </span>
              </div>
              {filtered
                .filter((i) => i.category === category)
                .map((item) => (
                  <article className="menu-editor-row" key={item.id}>
                    <ProductImage src={item.image_url} name={item.name} />
                    <div className="menu-item-copy">
                      <strong>{item.name}</strong>
                      <p>{item.description || "No description added"}</p>
                    </div>
                    <div className="menu-item-meta">
                      <span className="price">
                        {money(item.price_centavos)}
                      </span>
                      <Status
                        value={item.available ? "available" : "unavailable"}
                      />
                    </div>
                    <div className="row-actions">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => {
                          setError("");
                          setEditing(item);
                        }}
                      >
                        <Pencil size={16} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={busy}
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove {item.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes it from your menu. Orders already
                              submitted keep their original item details and
                              prices.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep item</AlertDialogCancel>
                            <AlertDialogAction onClick={() => remove(item)}>
                              Remove item
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
