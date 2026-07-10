"use client";

import React, { useState, useRef } from 'react';
import Button from '@/components/ui/Button';

type Plan = 'Basic' | 'Premium' | 'Enterprise';

export function InteractiveDemo() {
  const [plan, setPlan] = useState<Plan>('Premium');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [rawPreviewUrl, setRawPreviewUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [price, setPrice] = useState('₹499');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<{sender: 'user'|'bot', text?: string, image?: string}[]>([
    { sender: 'bot', text: 'Hi! Ready to test? Send me a photo of a product and a price.' }
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const objUrl = URL.createObjectURL(file);
      setRawPreviewUrl(objUrl);
      
      // Auto-populate chat
      setMessages(prev => [
        ...prev, 
        { sender: 'user', image: objUrl, text: `Product ${price}` }
      ]);
    }
  };

  const handleSend = async () => {
    if (!imageFile) return;

    setIsProcessing(true);
    setMessages(prev => [...prev, { sender: 'bot', text: 'Processing your image with AI... ⏳' }]);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await fetch('/api/demo', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.imageUrl) {
        setProcessedImageUrl(data.imageUrl);
        setMessages(prev => [...prev, { sender: 'bot', text: 'Done! I added this product to your store. ✅' }]);
      } else {
        // Fallback if backend isn't reachable or error occurred
        setMessages(prev => [...prev, { sender: 'bot', text: 'Demo backend is currently sleeping. Here is a simulated result! 🎨' }]);
        setProcessedImageUrl(rawPreviewUrl);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { sender: 'bot', text: 'Demo backend error. Simulation applied. 🎨' }]);
      setProcessedImageUrl(rawPreviewUrl); // fallback to raw image
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="container" style={{ paddingBottom: '6rem' }}>
      <div className="demo-layout">
        
        {/* Left Side: WhatsApp Simulation */}
        <div className="demo-whatsapp">
          <div className="whatsapp-header">
            <div className="whatsapp-header__avatar">MB</div>
            <div className="whatsapp-header__info">
              <strong>Maghgo Bot</strong>
              <small>Online</small>
            </div>
          </div>
          
          <div className="whatsapp-chat">
            {messages.map((msg, idx) => (
              <div key={idx} className={`whatsapp-msg whatsapp-msg--${msg.sender}`}>
                {msg.image && <img src={msg.image} alt="Upload" className="whatsapp-msg__img" />}
                {msg.text && <p>{msg.text}</p>}
              </div>
            ))}
            {isProcessing && (
              <div className="whatsapp-msg whatsapp-msg--bot">
                <div className="typing-indicator"><span></span><span></span><span></span></div>
              </div>
            )}
          </div>
          
          <div className="whatsapp-input">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <button className="whatsapp-input__btn" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
              📷
            </button>
            <input 
              type="text" 
              className="whatsapp-input__text" 
              value={`Product ${price}`}
              onChange={(e) => setPrice(e.target.value.replace('Product ', ''))}
              placeholder="Price..."
              disabled={!imageFile || isProcessing}
            />
            <button 
              className="whatsapp-input__send" 
              onClick={handleSend}
              disabled={!imageFile || isProcessing}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Right Side: Store Preview */}
        <div className="demo-preview">
          <div className="demo-preview__controls">
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Live Store Preview</h3>
            <div className="plan-toggles">
              {(['Basic', 'Premium', 'Enterprise'] as Plan[]).map((p) => (
                <button 
                  key={p} 
                  className={`plan-toggle ${plan === p ? 'plan-toggle--active' : ''}`}
                  onClick={() => setPlan(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className={`demo-store-card demo-store-card--${plan.toLowerCase()}`}>
            <div className="demo-store-card__image-container">
              {isProcessing ? (
                <div className="demo-skeleton"></div>
              ) : processedImageUrl ? (
                <img src={processedImageUrl} alt="Product" className="demo-store-card__img" />
              ) : (
                <div className="demo-placeholder">Waiting for product...</div>
              )}
            </div>
            
            <div className="demo-store-card__details">
              <h4 className="demo-store-card__title">Test Product</h4>
              <div className="demo-store-card__price">{price}</div>
              
              {plan !== 'Basic' && (
                <p className="demo-store-card__desc">Premium auto-generated description utilizing AI.</p>
              )}
              
              <Button className={plan === 'Basic' ? 'btn--secondary' : 'btn--primary'} style={{ width: '100%', marginTop: '1rem' }}>
                {plan === 'Enterprise' ? 'Buy Now with 1-Click' : 'Add to Cart'}
              </Button>
            </div>
            
            {plan === 'Enterprise' && (
              <div className="demo-enterprise-badge">Enterprise Storefront</div>
            )}
            {plan === 'Premium' && (
              <div className="demo-premium-border"></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
