import { ErrorMessage, Field, Loading, Mark } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { api, supabase, type Profile } from "@/lib/api";
import type { Session } from "@supabase/supabase-js";
import {
  Building2,
  ExternalLink,
  LogOut,
  ScanLine,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import { lazy, useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
const Operator = lazy(() =>
  import("@/pages/Operator").then((m) => ({ default: m.Operator })),
);
const BusinessAdmin = lazy(() =>
  import("@/pages/BusinessAdmin").then((m) => ({ default: m.BusinessAdmin })),
);
const Kiosk = lazy(() =>
  import("@/pages/Kiosk").then((m) => ({ default: m.Kiosk })),
);

function WorkspaceNavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild>
        <NavLink to={to} onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
function SignIn() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(data.get("email")),
        password: String(data.get("password")),
      });
      if (error) throw error;
    } catch {
      setError(
        "Could not sign in. Check your email and password, then try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-intro">
        <a href="/" className="brand">
          <Mark />
          Portable Kiosk
        </a>
        <div>
          <h1>
            A little less waiting.
            <br />A lot more serving.
          </h1>
          <p>Your menu, your customers, one connected workspace.</p>
          <div className="login-flow">
            <span>Publish a menu</span>
            <span>Receive an order</span>
            <span>Serve at the counter</span>
          </div>
        </div>
        <p className="login-foot">
          Made for the businesses behind every order.
        </p>
      </section>
      <section className="login-form-wrap">
        <form onSubmit={submit} method="post" aria-labelledby="login-title">
          <div className="login-title-icon">
            <ShieldCheck size={24} />
          </div>
          <h2 id="login-title">Sign in to your workspace</h2>
          <p>Use the account provided by your administrator.</p>
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoCapitalize="none"
            spellCheck={false}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          <ErrorMessage message={error} />
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <p className="hint login-help">
            Need an account? Contact your platform administrator.
          </p>
        </form>
      </section>
    </main>
  );
}
export default function Workspace() {
  const [session, setSession] = useState<Session | null | undefined>(undefined),
    [profile, setProfile] = useState<Profile | null>(null),
    [error, setError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, current) => {
      if (alive) setSession(current);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    let alive = true;
    setProfile(null);
    setError("");
    if (session)
      api<Profile>("/me")
        .then((p) => {
          if (alive) setProfile(p);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        });
    return () => {
      alive = false;
    };
  }, [session?.user.id, attempt]);
  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    navigate("/");
  }
  if (session === undefined) return <Loading />;
  if (!session) return <SignIn />;
  if (error)
    return (
      <main className="access-error">
        <Mark />
        <h1>Workspace unavailable</h1>
        <ErrorMessage message={error} />
        <div className="flex gap-3">
          <Button onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
          <Button variant="outline" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </main>
    );
  if (!profile) return <Loading />;
  const isOperator = profile.role === "operator";
  const nav = isOperator
    ? [{ to: "/businesses", label: "Businesses", icon: Building2 }]
    : [
        { to: "/menu", label: "Kiosk menu", icon: Utensils },
        { to: "/publishing", label: "Publish & share", icon: ScanLine },
        { to: "/pos", label: "Kiosk POS", icon: ShoppingBag },
        { to: "/settings", label: "Business settings", icon: Settings2 },
      ];
  return (
    <SidebarProvider>
      <Sidebar variant="inset">
        <SidebarHeader>
          <a className="brand" href="/">
            <Mark />
            <span>Portable Kiosk</span>
          </a>
          <div className="workspace-name">
            <span>
              {isOperator ? "Platform workspace" : profile.business?.name}
            </span>
            <small>
              {isOperator ? "Super administrator" : "Business workspace"}
            </small>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {nav.map((item) => (
              <WorkspaceNavItem key={item.to} {...item} />
            ))}
          </SidebarMenu>
          {!isOperator && profile.business && (
            <div className="sidebar-note">
              <p>Your menu, on their phone.</p>
              <span>Publish once. Share your kiosk anywhere.</span>
              <a
                href={`/k/${profile.business.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                Open kiosk
                <ExternalLink size={13} />
              </a>
            </div>
          )}
        </SidebarContent>
        <SidebarFooter>
          <div className="account-row">
            <span className="avatar">{profile.email[0].toUpperCase()}</span>
            <div>
              <strong>
                {isOperator ? "Platform administrator" : "Business owner"}
              </strong>
              <span title={profile.email}>{profile.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sign out"
              onClick={signOut}
            >
              <LogOut size={16} />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="workspace-bar">
          <div>
            <SidebarTrigger />
            <span>
              {isOperator ? "Platform" : "Workspace"}{" "}
              <span className="breadcrumb-slash">/</span>{" "}
              {isOperator ? "Businesses" : profile.business?.name}
            </span>
          </div>
          <span className="workspace-caption">
            {isOperator
              ? "Business administration"
              : "Your daily service, connected"}
          </span>
        </header>
        <main className="workspace-main">
          {isOperator ? (
            <Routes>
              <Route path="/businesses" element={<Operator />} />
              <Route path="*" element={<Navigate to="/businesses" replace />} />
            </Routes>
          ) : (
            <Routes>
              <Route
                path="/:section"
                element={
                  <BusinessAdmin
                    profile={profile}
                    onBusinessChange={(business) =>
                      setProfile({ ...profile, business })
                    }
                  />
                }
              />
              <Route path="*" element={<Navigate to="/menu" replace />} />
            </Routes>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
