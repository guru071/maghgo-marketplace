import React from 'react';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export function Pricing() {
  return (
    <section id="pricing" className="pricing">
      <div className="pricing__container">
        <h2 className="pricing__heading">Simple, Transparent Pricing</h2>
        <p className="pricing__subheading">No transaction fees. Ever.</p>
        
        <div className="pricing__cards">
          <div className="pricing__card">
            <h3 className="card__title">Trial</h3>
            <div className="card__price">₹0<span>/4 days</span></div>
            <ul className="card__features">
              <li>1 Product Limit (Testing)</li>
              <li>Basic background removal</li>
              <li>Custom maghgo.goatecch.tech link</li>
            </ul>
            <a href="https://wa.me/919876543210?text=REGISTER%20" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="w-full mt-6">Start Trial</Button>
            </a>
          </div>
          
          <div className="pricing__card pricing__card--featured">
            <div className="card__badge">Most Popular</div>
            <h3 className="card__title">Basic</h3>
            <div className="card__price">₹149<span>/mo</span></div>
            <ul className="card__features">
              <li>Up to 50 products</li>
              <li>HD background removal</li>
              <li>Custom maghgo.goatecch.tech link</li>
              <li>Priority WhatsApp support</li>
            </ul>
            <a href="https://wa.me/919876543210?text=REGISTER%20" target="_blank" rel="noopener noreferrer">
              <Button className="w-full mt-6">Get Basic</Button>
            </a>
          </div>
          
          <div className="pricing__card">
            <h3 className="card__title">Premium</h3>
            <div className="card__price">₹799<span>/mo</span></div>
            <p className="card__desc">For growing businesses.</p>
            <ul className="card__features">
              <li>Up to 200 products</li>
              <li>Everything in Basic</li>
              <li>Custom Domain Support</li>
              <li>Analytics Dashboard</li>
            </ul>
            <a href="https://wa.me/919876543210?text=REGISTER%20" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="w-full mt-6">Get Premium</Button>
            </a>
          </div>
          
          <div className="pricing__card">
            <h3 className="card__title">Enterprise</h3>
            <div className="card__price">₹4999<span>/mo</span></div>
            <p className="card__desc">Unlimited scale.</p>
            <ul className="card__features">
              <li>Unlimited products</li>
              <li>Custom Web Design</li>
              <li>API Access</li>
              <li>Priority Support</li>
            </ul>
            <a href="https://wa.me/919876543210?text=REGISTER%20" target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" className="w-full mt-6">Get Enterprise</Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
