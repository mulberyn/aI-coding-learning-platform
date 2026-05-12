import { SiteShell } from "@/components/site-shell";
import { LearningChatClient } from "./learning-chat-client";

export default async function LearningChatPage() {
  return (
    <SiteShell>
      <LearningChatClient />
    </SiteShell>
  );
}
