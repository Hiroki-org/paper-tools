import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { QuickStart } from "@/components/dashboard/QuickStart";
import { FeatureCards } from "@/components/dashboard/FeatureCards";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
        <DashboardHero />
        <QuickStart />
      </section>

      <FeatureCards />
    </div>
  );
}
