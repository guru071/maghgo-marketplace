"use client";

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

export function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  // Helper to calculate yearly price (15% off)
  const getPrice = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return '₹0';
    if (isYearly) {
      return `₹${Math.round(monthlyPrice * 0.85 * 12)}`;
    }
    return `₹${monthlyPrice}`;
  };

  const period = isYearly ? '/yr' : '/mo';

  const plans = [
    {
      name: 'Free Trial',
      monthlyPrice: 0,
      period: '/4 days',
      description: 'Testing the waters.',
      features: ['1 Product', 'Basic AI', 'Maghgo domain'],
      buttonText: 'Start Free Trial',
      buttonVariant: 'secondary' as const,
      colorTheme: '#E5E7EB' // Gray
    },
    {
      name: 'Basic',
      monthlyPrice: 99,
      description: 'For small side-hustles.',
      features: ['Up to 50 Products', 'Standard Processing', 'Basic Store'],
      buttonText: 'Start Free Trial', 
      buttonVariant: 'secondary' as const,
      colorTheme: '#D1FAE5' // Emerald
    },
    {
      name: 'Starter',
      monthlyPrice: 149,
      description: 'For growing sellers.',
      features: ['Up to 150 Products', 'Priority AI', 'Basic Analytics'],
      buttonText: 'Get Starter',
      buttonVariant: 'secondary' as const,
      colorTheme: '#DBEAFE' // Blue
    },
    {
      name: 'Pro',
      monthlyPrice: 249,
      description: 'For established shops.',
      features: ['Up to 300 Products', 'Faster AI', 'Custom Domain'],
      buttonText: 'Get Pro',
      buttonVariant: 'secondary' as const,
      colorTheme: '#E0E7FF' // Indigo
    },
    {
      name: 'Advanced',
      monthlyPrice: 349,
      description: 'More features, more power.',
      features: ['Up to 600 Products', 'Custom Branding', 'SEO Tools'],
      buttonText: 'Get Advanced',
      buttonVariant: 'secondary' as const,
      colorTheme: '#F3E8FF' // Purple
    },
    {
      name: 'Premium',
      monthlyPrice: 499,
      description: 'The sweet spot for most businesses.',
      features: ['Up to 1000 Products', 'Priority AI', 'Custom Domain', 'Full Analytics'],
      buttonText: 'Go Premium',
      buttonVariant: 'primary' as const,
      featured: true,
      colorTheme: '#FFEDD5' // Orange (Featured)
    },
    {
      name: 'Business',
      monthlyPrice: 749,
      description: 'Scale your operations.',
      features: ['Up to 2000 Products', 'Team Accounts', 'API Access'],
      buttonText: 'Get Business',
      buttonVariant: 'secondary' as const,
      colorTheme: '#FCE7F3' // Pink
    },
    {
      name: 'Agency',
      monthlyPrice: 999,
      description: 'Managing multiple brands.',
      features: ['5 Storefronts', 'White-labeling', 'Dedicated AM'],
      buttonText: 'Get Agency',
      buttonVariant: 'secondary' as const,
      colorTheme: '#FEF3C7' // Amber
    },
    {
      name: 'VIP',
      monthlyPrice: 1499,
      description: 'Maximum performance.',
      features: ['15 Storefronts', 'Custom AI Training', 'SLA Guarantee'],
      buttonText: 'Get VIP',
      buttonVariant: 'secondary' as const,
      colorTheme: '#ECFCCB' // Lime
    },
    {
      name: 'Enterprise',
      monthlyPrice: 1999,
      description: 'Unlimited scale.',
      features: ['Unlimited Products', 'Dedicated Support', 'Custom Integrations', 'White-label'],
      buttonText: 'Start Free Trial',
      buttonVariant: 'secondary' as const,
      colorTheme: '#CFFAFE' // Cyan
    },
    {
      name: 'Custom',
      monthlyPrice: 0,
      period: '',
      description: 'Need something specific?',
      features: ['Tailored features', 'On-premise option', 'Bespoke UI'],
      buttonText: 'Contact Sales',
      buttonVariant: 'secondary' as const,
      isCustom: true,
      colorTheme: '#F3F4F6' // Light Gray
    }
  ];

  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <h2 className="pricing__title">Plans for Every Seller</h2>
        <p className="pricing__subtitle">Start for free, upgrade when you need to grow.</p>
        
        {/* Monthly / Yearly Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
          <span style={{ fontWeight: !isYearly ? 'bold' : 'normal', color: !isYearly ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Monthly
          </span>
          <button 
            onClick={() => setIsYearly(!isYearly)}
            style={{
              width: '60px', height: '32px', background: 'var(--accent)', borderRadius: '16px', 
              position: 'relative', cursor: 'pointer', border: 'none', transition: 'all 0.3s'
            }}
            aria-label="Toggle billing period"
          >
            <div style={{
              width: '24px', height: '24px', background: '#fff', borderRadius: '50%',
              position: 'absolute', top: '4px', left: isYearly ? '32px' : '4px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} />
          </button>
          <span style={{ fontWeight: isYearly ? 'bold' : 'normal', color: isYearly ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Yearly <span style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 'bold' }}>(Save 15%)</span>
          </span>
        </div>

        {/* Massive 10+ Plan Grid - Responsive */}
        <div className="pricing__grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`pricing__card ${plan.featured ? 'pricing__card--featured' : ''}`}
              style={{
                borderTop: `6px solid ${plan.colorTheme}`,
                backgroundColor: plan.featured ? '#fff' : '#fafafa'
              }}
            >
              <h3 className="pricing__card-name">{plan.name}</h3>
              <div className="pricing__card-price">
                {plan.isCustom ? 'Let\'s Talk' : getPrice(plan.monthlyPrice)}
                {!plan.isCustom && <span>{plan.period || period}</span>}
              </div>
              <p className="pricing__card-desc">{plan.description}</p>
              
              <ul className="pricing__card-features">
                {plan.features.map((feature, i) => (
                  <li key={i} className="pricing__card-feature">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <a 
                href={`https://wa.me/919876543210?text=${encodeURIComponent(`Hi Maghgo, I want to ${plan.buttonText.toLowerCase().includes('trial') ? 'start the free trial for' : 'buy'} the ${plan.name} Plan (${getPrice(plan.monthlyPrice)}${plan.period || period}).`)}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ width: '100%', marginTop: 'auto' }}
              >
                <Button variant={plan.buttonVariant} className="btn--full">
                  {plan.buttonText}
                </Button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
