import { SiteShell } from "@/components/site-shell";
import { VideoSearchPanel } from "@/app/components/VideoSearchPanel";

export default async function VideosPage() {
  return (
    <SiteShell>
      <div className="min-h-screen bg-background">
        <VideoSearchPanel />
      </div>
    </SiteShell>
  );
}
