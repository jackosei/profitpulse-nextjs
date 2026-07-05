'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { EnvelopeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/context/AuthContext';
import { track } from '@/services/analytics/track';
import { toast } from 'sonner';

const SUBJECTS = [
  'General question',
  'Feature request',
  'Bug report',
  'Account issue',
  'Other',
] as const;

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSubject('');
      setMessage('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      const { getFirebaseToken } = await import('@/services/firebase/authService');
      const token = await getFirebaseToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject,
          message,
          senderEmail: user.email,
          senderName: user.displayName || user.email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      track('contact_submitted', { subject });
      toast.success("Message sent — we'll get back to you soon.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const isValid = subject.trim() !== '' && message.trim().length >= 20;

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-xl bg-dark border border-gray-800 shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                <EnvelopeIcon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Contact Developers
                </DialogTitle>
                <p className="text-xs text-gray-500">We typically respond within 1–2 business days</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Sender info — read-only */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg">
              <span className="text-xs text-gray-500">From</span>
              <span className="text-sm text-gray-300 truncate">{user?.email}</span>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="input-dark w-full"
                required
              >
                <option value="">Select a topic…</option>
                {SUBJECTS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Message</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe your question or issue in detail…"
                className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-accent focus:outline-none resize-none text-sm"
                required
              />
              <p className={`text-xs mt-1 text-right ${message.length < 20 ? 'text-gray-600' : 'text-gray-500'}`}>
                {message.trim().length} / 20 min
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/40 border border-red-800 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || loading}
                className="px-5 py-2 text-sm font-medium bg-accent hover:bg-accent/80 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
