import React from 'react';

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Send a Photo',
      description: 'Snap a picture of your product and send it to our WhatsApp bot with the price in the caption (e.g. "Red T-Shirt Rs 499").'
    },
    {
      number: '02',
      title: 'AI Magic',
      description: 'We instantly remove the messy background and make your photo look like it was shot in a professional studio.'
    },
    {
      number: '03',
      title: 'Store Goes Live',
      description: 'Your product is automatically added to your beautiful, fast, custom web store, ready for customers to buy.'
    }
  ];

  return (
    <section id="how-it-works" className="how-it-works">
      <div className="how-it-works__container">
        <h2 className="how-it-works__heading">How It Works</h2>
        <div className="how-it-works__steps">
          {steps.map((step, index) => (
            <div key={index} className="how-it-works__step">
              <div className="step__number">{step.number}</div>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
