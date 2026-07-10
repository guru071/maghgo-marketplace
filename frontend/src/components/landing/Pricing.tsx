import React from 'react';
import Button from '@/components/ui/Button';

export function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '₹149',
      period: '/mo',
      description: 'Perfect for testing the waters.',
      features: [
        'Up to 50 Products',
        'AI Background Removal',
        'Basic Store Link'
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'secondary' as const
    },
    {
      name: 'Premium',
      price: '₹799',
      period: '/mo',
      description: 'For growing businesses.',
      features: [
        'Up to 1000 Products',
        'Priority AI Processing',
        'Custom Domain Support',
        'Analytics Dashboard'
      ],
      buttonText: 'Go Premium',
      buttonVariant: 'primary' as const,
      featured: true
    },
    {
      name: 'Enterprise',
      price: '₹4999',
      period: '/mo',
      description: 'For power sellers.',
      features: [
        'Unlimited Products',
        'Dedicated Support',
        'Custom API Integrations',
        'White-label Solution'
      ],
      buttonText: 'Contact Sales',
      buttonVariant: 'secondary' as const
    }
  ];

  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <h2 className="pricing__title">Simple, Transparent Pricing</h2>
        <p className="pricing__subtitle">Start for free, upgrade when you need to grow.</p>
        
        <div className="pricing__grid">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`pricing__card ${plan.featured ? 'pricing__card--featured' : ''}`}
            >
              <h3 className="pricing__card-name">{plan.name}</h3>
              <div className="pricing__card-price">
                {plan.price}<span>{plan.period}</span>
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
              
              <a href="https://wa.me/919876543210?text=UPGRADE%20" target="_blank" rel="noopener noreferrer" style={{ width: '100%' }}>
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
