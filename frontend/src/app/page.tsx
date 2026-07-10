import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Header />
      <Hero />
      <HowItWorks />
      <Pricing />
      
      <footer className="footer">
        <div className="footer__container">
          <div className="footer__logo-wrapper">
            <img src="/logo.jpg" alt="Maghgo Logo" className="footer__logo" />
          </div>
          <p className="footer__text">
            Created by <a href="https://goatech.tech" target="_blank" rel="noopener noreferrer" className="footer__link">GOAT'ECH</a>
          </p>
          <p className="footer__subtext">
            Empowering sellers with AI-driven WhatsApp commerce.
          </p>
        </div>
      </footer>
    </main>
  );
}
