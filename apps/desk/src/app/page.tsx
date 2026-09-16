import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { AttackVoid, ShieldVoid, StatCard } from "@/components/void-sections";
import { LayeredPlanes } from "@/components/layered-planes";
import { IntegrationCard } from "@/components/integration-card";
import { StackSpread } from "@/components/stack-spread";
import { CapabilityMarquee } from "@/components/marquee";
import { Benchmark } from "@/components/benchmark";
import { EvidenceGrid } from "@/components/evidence-grid";
import { Quickstart } from "@/components/quickstart";
import { CtaBand } from "@/components/cta-band";
import { Footer } from "@/components/footer";
import { RevealProvider } from "@/components/motion";

/*
 * Section order follows the reference video's scroll sequence, and preserves
 * DESIGN.md's signature rhythm: dark hero → pure black void → expansive white
 * product surface, closing on the sandstone band and the black footer.
 */
export default function Page() {
  return (
    <RevealProvider>
      <Navbar />
      <main>
        <Hero />
        <AttackVoid />
        <ShieldVoid />
        <LayeredPlanes />
        <StackSpread />
        <StatCard />
        <CapabilityMarquee />
        <IntegrationCard />
        <Benchmark />
        <EvidenceGrid />
        <Quickstart />
        <CtaBand />
      </main>
      <Footer />
    </RevealProvider>
  );
}
