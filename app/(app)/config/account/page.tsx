import ConfigClient from "../ConfigClient";

// Config → Account: signed-in identity and sign out.
export const dynamic = "force-dynamic";

export default function ConfigAccountPage() {
  return <ConfigClient section="account" />;
}
