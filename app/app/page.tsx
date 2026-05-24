import { BrieflyWorkspace } from "@/components/briefly-workspace";

export const dynamic = "force-dynamic";

export default function WorkspacePage() {
  const pollinationsClientId =
    process.env.POLLINATIONS_CLIENT_ID ||
    process.env.NEXT_PUBLIC_POLLINATIONS_CLIENT_ID ||
    "";

  return <BrieflyWorkspace pollinationsClientId={pollinationsClientId} />;
}
