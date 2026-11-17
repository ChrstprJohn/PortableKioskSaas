import {
  Empty,
  ErrorMessage,
  Field,
  Heading,
  Loading,
  Status,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, json, type Business } from "@/lib/api";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export function Operator() {
  const [businesses, setBusinesses] = useState<Business[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [created, setCreated] = useState<Business | null>(null);
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [slug, setSlug] = useState("");
  const request = useRef(crypto.randomUUID());
  const load = () => {
    setError("");
    setLoading(true);
    api<Business[]>("/operator/businesses")
      .then(setBusinesses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  function start() {
    setName("");
    setSlug("");
    setEmail("");
    setPassword("");
    setError("");
    setCreated(null);
    request.current = crypto.randomUUID();
    setCreating(true);
  }
  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const business = await api<Business>("/operator/businesses", {
        method: "POST",
        body: json({
          name,
          slug,
          email,
          password,
          request_id: request.current,
        }),
      });
      setCreated(business);
      setCreating(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(business: Business) {
    setBusy(true);
    try {
      const updated = await api<Business>(
        `/operator/businesses/${business.id}/status`,
        { method: "PATCH", body: json({ active: !business.active }) },
      );
      setBusinesses((rows) =>
        rows.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)),
      );
      toast.success(
        updated.active ? "Business activated" : "Business deactivated",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = businesses.filter(
    (b) =>
      (filter === "all" || (filter === "active" ? b.active : !b.active)) &&
      `${b.name} ${b.owner_email} ${b.slug}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (creating)
    return (
      <>
        <Button
          variant="ghost"
          onClick={() => {
            setCreating(false);
            setPassword("");
            setError("");
          }}
        >
          <ArrowLeft />
          All businesses
        </Button>
        <Heading
          title="Register a business"
          description="Create a workspace and its owner's sign-in account."
        />
        <div className="form-layout">
          <form
            method="post"
            onSubmit={register}
            aria-labelledby="business-account-title"
            className="form-panel"
          >
            <h2 id="business-account-title">Business & owner account</h2>
            <Field
              label="Business name"
              value={name}
              maxLength={100}
              required
              onChange={(e) => {
                setName(e.target.value);
                if (
                  !slug ||
                  slug ===
                    name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")
                )
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  );
              }}
            />
            <Field
              label="Kiosk address"
              hint="3–60 lowercase letters, numbers, or hyphens. This address stays with the business."
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              minLength={3}
              maxLength={60}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              required
              autoCapitalize="none"
              spellCheck={false}
            />
            <div className="form-divider" />
            <Field
              label="Owner email"
              name="email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Field
              label="Set owner password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="At least 12 characters. Share it privately with the owner."
            />
            <ErrorMessage message={error} />
            <div className="form-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreating(false);
                  setPassword("");
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Creating workspace…" : "Create business & account"}
              </Button>
            </div>
          </form>
          <aside className="context-note">
            <Building2 size={24} />
            <h2>Ready for their first menu.</h2>
            <p>
              The owner can sign in immediately. No email verification or
              invitation is needed.
            </p>
            <p>
              Their menu, orders, and branding belong to this business alone.
              The kiosk stays unpublished until they are ready.
            </p>
          </aside>
        </div>
      </>
    );
  return (
    <>
      <Heading
        title="Businesses"
        description="A workspace for every business you bring on board."
      >
        <Button onClick={start}>
          <Plus />
          Register business
        </Button>
      </Heading>
      {created && (
        <section className="success-panel" role="status">
          <Check size={20} />
          <div>
            <h2>{created.name} is ready to set up.</h2>
            <p>
              Share these sign-in details privately. The password will disappear
              when you dismiss this panel.
            </p>
            <dl>
              <dt>Owner email</dt>
              <dd>{email}</dd>
              <dt>Password</dt>
              <dd>
                <code>{password}</code>
              </dd>
              <dt>Workspace</dt>
              <dd>{window.location.origin}</dd>
            </dl>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() =>
                  navigator.clipboard
                    .writeText(
                      `Workspace: ${window.location.origin}\nEmail: ${email}\nPassword: ${password}`,
                    )
                    .then(() => toast.success("Sign-in details copied"))
                    .catch(() =>
                      toast.error(
                        "Clipboard unavailable. Copy the details manually.",
                      ),
                    )
                }
              >
                <Copy size={14} />
                Copy sign-in details
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setCreated(null);
                  setPassword("");
                }}
              >
                Dismiss & clear password
              </Button>
            </div>
          </div>
        </section>
      )}
      <div className="tabs" role="group" aria-label="Business status">
        {["all", "active", "inactive"].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={filter === value ? "selected" : ""}
          >
            {value === "all"
              ? "All businesses"
              : value.charAt(0).toUpperCase() + value.slice(1)}
            <span>
              {value === "all"
                ? businesses.length
                : businesses.filter((b) =>
                    value === "active" ? b.active : !b.active,
                  ).length}
            </span>
          </button>
        ))}
      </div>
      <div className="list-toolbar">
        <search className="search-field">
          <Search size={16} />
          <Input
            aria-label="Search businesses"
            type="search"
            placeholder="Search name, email, or address…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </search>
        <span>
          {filtered.length} {filtered.length === 1 ? "business" : "businesses"}
        </span>
      </div>
      <ErrorMessage message={error} />
      {error && (
        <Button variant="outline" onClick={load}>
          Retry loading
        </Button>
      )}
      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <Empty
          title={
            businesses.length
              ? "No matching businesses"
              : "Your first business starts here."
          }
        >
          {businesses.length
            ? "Try another business name or choose a different account status."
            : "Register a business to give its owner a menu, a kiosk, and a place to manage orders."}
        </Empty>
      ) : (
        <Table className="business-table">
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Owner account</TableHead>
              <TableHead>Menu</TableHead>
              <TableHead>Access</TableHead>
              <TableHead className="text-right">Manage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <div className="business-identity">
                    <span className="business-initial">
                      {b.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <strong>{b.name}</strong>
                      <a href={`/k/${b.slug}`} target="_blank" rel="noreferrer">
                        /k/{b.slug}
                        <ArrowUpRight size={12} />
                      </a>
                      <small className="mobile-owner">{b.owner_email}</small>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="owner-cell">{b.owner_email}</TableCell>
                <TableCell>
                  <span>{b.menu_count || 0} items</span>
                  <small className="cell-subline">
                    {b.published ? "Published" : "Draft"}
                  </small>
                </TableCell>
                <TableCell>
                  <Status value={b.active ? "active" : "inactive"} />
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={busy}>
                        {b.active ? "Deactivate" : "Activate"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          {b.active ? "Deactivate" : "Activate"} {b.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {b.active
                            ? "The owner will lose workspace access and customers will be unable to place orders. Existing menus and orders will be kept."
                            : "The owner can use their workspace again. A previously published kiosk will accept orders again."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>
                          Keep current status
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => changeStatus(b)}>
                          {b.active
                            ? "Deactivate business"
                            : "Activate business"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <p className="table-footnote">
        Each business has its own menu, branding, and orders. Account access is
        controlled here.
      </p>
    </>
  );
}
