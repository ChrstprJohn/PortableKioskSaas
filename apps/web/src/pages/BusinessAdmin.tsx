import { MenuEditor } from "@/features/business/MenuEditor";
import { POS } from "@/features/business/POS";
import { Publishing } from "@/features/business/Publishing";
import { Settings } from "@/features/business/Settings";
import type { Business, Profile } from "@/lib/api";
import { Navigate, useParams } from "react-router-dom";
export function BusinessAdmin({
  profile,
  onBusinessChange,
}: {
  profile: Profile;
  onBusinessChange: (b: Business) => void;
}) {
  const { section } = useParams();
  if (!profile.business) return null;
  if (section === "menu") return <MenuEditor business={profile.business} />;
  if (section === "settings")
    return <Settings business={profile.business} onChange={onBusinessChange} />;
  if (section === "publishing")
    return (
      <Publishing business={profile.business} onChange={onBusinessChange} />
    );
  if (section === "pos") return <POS />;
  return <Navigate to="/menu" replace />;
}
