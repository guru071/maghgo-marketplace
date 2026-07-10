import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Hero />
      <HowItWorks />
      <Pricing />
      
      <footer className="w-full py-8 text-center border-t border-gray-200 mt-12 bg-white">
        <p className="text-gray-500 font-medium">
          Created by <a href="https://goatech.tech" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover font-bold transition-colors">GOAT'ECH</a>
        </p>
        <p className="text-sm text-gray-400 mt-1">
          <a href="https://goatech.tech" target="_blank" rel="noopener noreferrer" className="hover:underline">goatech.tech</a>
        </p>
      </footer>
    </main>
  );
}
