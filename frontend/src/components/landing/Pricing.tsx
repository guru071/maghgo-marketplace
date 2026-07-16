"use client";

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { MessageCircle, MessageSquare, Camera, X } from 'lucide-react';
import { whatsappLink, instagramLink, messengerLink, smsLink } from '@/lib/site-config';

export function Pricing({ 
  enabledPlatforms = {
    whatsapp_enabled: true,
    instagram_enabled: true,
    messenger_enabled: true,
    sms_enabled: true
  },
  plans = []
}: { 
  enabledPlatforms?: any,
  plans?: any[]
}) {
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Helper to calculate yearly price (15% off)
  const getPrice = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return '₹0';
    if (isYearly) {
      return `₹${Math.round(monthlyPrice * 0.85 * 12)}`;
    }
    return `₹${monthlyPrice}`;
  };

  const period = isYearly ? '/yr' : '/mo';

  return (
    <section id="pricing" className="pricing">
      <div className="container">
        <h2 className="pricing__title">Plans for Every Seller</h2>
        <p className="pricing__subtitle">Start instantly with any plan to grow your business.</p>
        
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
                {plan.is_custom ? 'Let\'s Talk' : getPrice(plan.monthly_price)}
                {!plan.is_custom && <span>{period}</span>}
              </div>
              <p className="pricing__card-desc">{plan.description}</p>
              
              <ul className="pricing__card-features">
                {plan.features?.map((feature: string, i: number) => (
                  <li key={i} className="pricing__card-feature">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              
              <div style={{ width: '100%', marginTop: 'auto' }}>
                <Button 
                  variant={plan.button_variant || 'secondary'} 
                  className="btn--full"
                  onClick={() => setSelectedPlan(plan.name)}
                >
                  {plan.is_custom ? 'Contact Sales' : `Get ${plan.name}`}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Channel Selection Modal */}
      {selectedPlan && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedPlan(null)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedPlan(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">How do you want to build?</h3>
              <p className="text-gray-500 mt-2">Select your preferred chat platform to register for the {selectedPlan} plan.</p>
            </div>

            <div className="space-y-3">
              {enabledPlatforms.whatsapp_enabled && whatsappLink(`REGISTER [Type your store name here] - ${selectedPlan.toUpperCase()}`) && (
                <a
                  href={whatsappLink(`REGISTER [Type your store name here] - ${selectedPlan.toUpperCase()}`)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-[#25D366] hover:bg-[#25D366]/5 transition-all group"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                    <MessageCircle size={24} />
                  </div>
                  <div className="ml-4 text-left">
                    <span className="block font-semibold text-gray-900">WhatsApp</span>
                    <span className="text-sm text-gray-500">Fastest and most popular</span>
                  </div>
                </a>
              )}

              {enabledPlatforms.instagram_enabled && instagramLink() && (
                <a
                  href={instagramLink()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-pink-500 hover:bg-pink-50 transition-all group"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-pink-100 text-pink-600 group-hover:bg-gradient-to-tr group-hover:from-yellow-400 group-hover:via-pink-500 group-hover:to-purple-500 group-hover:text-white transition-all">
                    <Camera size={24} />
                  </div>
                  <div className="ml-4 text-left">
                    <span className="block font-semibold text-gray-900">Instagram DM</span>
                    <span className="text-sm text-gray-500">Build your store via Insta</span>
                  </div>
                </a>
              )}

              {enabledPlatforms.messenger_enabled && messengerLink() && (
                <a
                  href={messengerLink()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <MessageSquare size={24} />
                  </div>
                  <div className="ml-4 text-left">
                    <span className="block font-semibold text-gray-900">Messenger</span>
                    <span className="text-sm text-gray-500">Use Facebook Messenger</span>
                  </div>
                </a>
              )}

              {enabledPlatforms.sms_enabled && smsLink(`REGISTER [Type your store name here] - ${selectedPlan.toUpperCase()}`) && (
                <a
                  href={smsLink(`REGISTER [Type your store name here] - ${selectedPlan.toUpperCase()}`)!}
                  className="w-full flex items-center p-4 rounded-xl border border-gray-200 hover:border-gray-800 hover:bg-gray-50 transition-all group"
                >
                  <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 group-hover:bg-gray-800 group-hover:text-white transition-colors">
                    <MessageSquare size={24} />
                  </div>
                  <div className="ml-4 text-left">
                    <span className="block font-semibold text-gray-900">SMS / Text</span>
                    <span className="text-sm text-gray-500">No internet required</span>
                  </div>
                </a>
              )}
            </div>
            
            <div className="mt-6 text-center text-sm text-gray-400">
              Just send the pre-filled message to instantly build your store!
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
