'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { getPlatformSettings, updatePlatformSettings } from './actions';
import { MessageCircle, Camera, MessageSquare, Phone } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    whatsapp_enabled: true,
    telegram_enabled: true,
    instagram_enabled: true,
    messenger_enabled: true,
    sms_enabled: true,
  });
  const [isPending, startTransition] = useTransition();
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformSettings().then(data => {
      setSettings({
        whatsapp_enabled: data.whatsapp_enabled,
        telegram_enabled: data.telegram_enabled ?? true,
        instagram_enabled: data.instagram_enabled,
        messenger_enabled: data.messenger_enabled,
        sms_enabled: data.sms_enabled,
      });
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      await updatePlatformSettings(settings);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    });
  };

  const Toggle = ({ 
    checked, 
    onChange 
  }: { 
    checked: boolean; 
    onChange: (val: boolean) => void 
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  if (loading) {
    return <div className="p-8 text-gray-500">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-gray-500 mt-2">Master kill-switches: each toggle disables the BOT on that channel (replies with a maintenance notice) AND hides it from the website. Takes effect within ~1 minute.</p>
        </div>
        <Button onClick={handleSave} disabled={isPending} className="w-32">
          {isPending ? 'Saving...' : (isSaved ? 'Saved!' : 'Save Changes')}
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Registration Channels</h2>
          <p className="text-sm text-gray-500 mt-1">
            OFF = the bot stops processing messages on that channel (one polite maintenance reply, nothing else) and the channel disappears from the landing-page signup modal. ON = back to normal — no redeploy needed.
          </p>
        </div>
        
        <div className="divide-y divide-gray-100">
          <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">WhatsApp</h3>
                <p className="text-sm text-gray-500">Allow users to build stores via WhatsApp</p>
              </div>
            </div>
            <Toggle 
              checked={settings.whatsapp_enabled} 
              onChange={v => setSettings(s => ({ ...s, whatsapp_enabled: v }))} 
            />
          </div>

          <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Telegram</h3>
                <p className="text-sm text-gray-500">Allow users to build stores via Telegram</p>
              </div>
            </div>
            <Toggle 
              checked={settings.telegram_enabled ?? true} 
              onChange={v => setSettings(s => ({ ...s, telegram_enabled: v }))} 
            />
          </div>

          <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center">
                <Camera size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Instagram DM</h3>
                <p className="text-sm text-gray-500">Allow users to build stores via Instagram DM</p>
              </div>
            </div>
            <Toggle 
              checked={settings.instagram_enabled} 
              onChange={v => setSettings(s => ({ ...s, instagram_enabled: v }))} 
            />
          </div>

          <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Facebook Messenger</h3>
                <p className="text-sm text-gray-500">Allow users to build stores via Messenger</p>
              </div>
            </div>
            <Toggle 
              checked={settings.messenger_enabled} 
              onChange={v => setSettings(s => ({ ...s, messenger_enabled: v }))} 
            />
          </div>

          <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center">
                <Phone size={20} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">SMS / Text Message</h3>
                <p className="text-sm text-gray-500">Allow users to build stores via traditional SMS</p>
              </div>
            </div>
            <Toggle 
              checked={settings.sms_enabled} 
              onChange={v => setSettings(s => ({ ...s, sms_enabled: v }))} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
