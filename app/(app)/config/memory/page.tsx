import ConfigClient from "../ConfigClient";

// Config → Memory & rules: standing instructions and saved facts.
export const dynamic = "force-dynamic";

export default function ConfigMemoryPage() {
  return <ConfigClient section="memory" />;
}
