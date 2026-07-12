"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface DemoProduct {
  id: string;
  title: string;
  price: number;
  image: string;
}

export function WorkingModelDemo() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<{sender: 'bot' | 'user', text: string}[]>([
    { sender: 'bot', text: 'Welcome to Maghgo! Send a product image and a caption like "Red Shirt ₹499" to add it to your store instantly.' }
  ]);
  const [products, setProducts] = useState<DemoProduct[]>([
    { id: '1', title: 'Sample Sneakers', price: 1299, image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80' }
  ]);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text: inputText }]);
    const currentInput = inputText;
    setInputText('');

    // Simulate backend AI parsing
    setTimeout(() => {
      // Basic regex to find price
      const priceMatch = currentInput.match(/(?:Rs\.?|₹|INR)?\s*(\d+)/i);
      const titleMatch = currentInput.replace(/(?:Rs\.?|₹|INR)?\s*\d+/i, '').trim();
      
      const title = titleMatch || 'Awesome New Product';
      const price = priceMatch ? parseInt(priceMatch[1], 10) : 999;
      
      // Simulate Bot Reply
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: `✅ Product added successfully!\n\n📦 ${title}\n💰 ₹${price}\n\n🔗 View store: maghgo.goatech.tech/demo` 
      }]);

      // Instantly add to Web Store (right side)
      setProducts(prev => [{
        id: Date.now().toString(),
        title,
        price,
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80' // Placeholder image since they can't actually upload images in this demo
      }, ...prev]);

    }, 1000);
  };

  return (
    <section className="demo-section">
      <div className="container">
        <h2 className="demo-section__title">See the Magic Happen</h2>
        <p className="demo-section__subtitle">Try it yourself. Type a message in WhatsApp and watch it instantly appear on the web store.</p>
        
        <div className="demo-section__split">
          {/* Left: WhatsApp Simulator */}
          <div className="demo-section__whatsapp">
            <div className="demo-section__whatsapp-header">
              <div className="demo-section__whatsapp-avatar"></div>
              <div className="demo-section__whatsapp-name">
                <strong>Maghgo Bot</strong>
                <span>online</span>
              </div>
            </div>
            
            <div className="demo-section__whatsapp-chat" ref={chatRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`demo-section__whatsapp-msg demo-section__whatsapp-msg--${msg.sender}`}>
                  {msg.text.split('\n').map((line, j) => (
                    <span key={j}>{line}<br/></span>
                  ))}
                </div>
              ))}
            </div>
            
            <form onSubmit={handleSend} className="demo-section__whatsapp-input-area">
              <input 
                type="text" 
                placeholder="E.g. Blue Denim Jacket ₹1499" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="demo-section__whatsapp-input"
              />
              <button type="submit" className="demo-section__whatsapp-send">
                <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
                </svg>
              </button>
            </form>
          </div>

          {/* Right: Live Web Store */}
          <div className="demo-section__store">
            <div className="demo-section__store-header">
              <h3>Demo Store</h3>
              <span>maghgo.goatech.tech/demo</span>
            </div>
            
            <div className="demo-section__store-grid">
              {products.map(p => (
                <div key={p.id} className="demo-section__store-product animate-pop-in">
                  <div className="demo-section__store-product-img">
                    <Image src={p.image} alt={p.title} fill style={{objectFit: 'cover'}} />
                  </div>
                  <div className="demo-section__store-product-info">
                    <h4>{p.title}</h4>
                    <span>₹{p.price.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
