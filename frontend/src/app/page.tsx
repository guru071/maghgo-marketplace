import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Hero />
      <HowItWorks />
      <Pricing />
    </main>
  );
}
