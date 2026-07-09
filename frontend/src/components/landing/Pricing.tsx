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
            <Link href="#start">
              <Button variant="secondary" className="w-full mt-6">Start Trial</Button>
            </Link>
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
            <Link href="#start">
              <Button className="w-full mt-6">Get Basic</Button>
            </Link>
          </div>
          
          <div className="pricing__card">
            <h3 className="card__title">Premium</h3>
            <div className="card__price">₹499<span>/mo</span></div>
            <ul className="card__features">
              <li>Up to 200 products</li>
              <li>Everything in Basic</li>
              <li>Custom Domain Support</li>
              <li>Analytics Dashboard</li>
            </ul>
            <Link href="#start">
              <Button variant="secondary" className="w-full mt-6">Get Premium</Button>
            </Link>
          </div>
          
          <div className="pricing__card">
            <h3 className="card__title">Enterprise</h3>
            <div className="card__price">₹2999<span>/mo</span></div>
            <ul className="card__features">
              <li>Unlimited products</li>
              <li>Custom Web Design</li>
              <li>API Access</li>
              <li>Priority Support</li>
            </ul>
            <Link href="#start">
              <Button variant="secondary" className="w-full mt-6">Get Enterprise</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
