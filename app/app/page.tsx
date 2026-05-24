import { BrieflyWorkspace } from "@/components/briefly-workspace";

export const dynamic = "force-dynamic";

export default function WorkspacePage() {
  const pollinationsClientId = process.env.POLLINATIONS_CLIENT_ID || "";

  return <BrieflyWorkspace pollinationsClientId={pollinationsClientId} />;
}
