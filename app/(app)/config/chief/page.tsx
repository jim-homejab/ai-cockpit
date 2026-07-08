import ConfigClient from "../ConfigClient";

// Config → Chief settings: the model picker and Chief's tunable behavior.
export const dynamic = "force-dynamic";

export default function ConfigChiefPage() {
  return <ConfigClient section="chief" />;
}
