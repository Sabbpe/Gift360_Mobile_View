// components/ResellerContactModal.tsx
// Reseller-specific contact modal with business registration fields
import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, CheckCircle, Building2, MapPin, Map, FileText, CreditCard, MessageSquare, Loader2 } from 'lucide-react';
import { submitContactLead } from '@/api/contactApi';

interface ResellerContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResellerContactModal({ 
  isOpen, 
  onClose
}: ResellerContactModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    organizationName: '',
    city: '',
    state: '',
    pan: '',
    gst: '',
    message: ''
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await submitContactLead({
        role: 'RESELLER',
        organizationName: formData.organizationName,
        city: formData.city,
        state: formData.state,
        pan: formData.pan,
        gst: formData.gst,
        message: formData.message
      });

      setSubmitted(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setLoading(false);
    setError(null);
    setFormData({
      organizationName: '',
      city: '',
      state: '',
      pan: '',
      gst: '',
      message: ''
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <h2 className="text-xl font-bold text-gray-900">Get Registered</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-6 pb-8">
          {submitted ? (
            // Success State
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">We will get in touch with you</h3>
                <p className="text-sm text-gray-600">
                  Our team will contact you shortly regarding reseller onboarding.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                Close
              </button>
            </div>
          ) : (
            // Contact Form
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Organization Name */}
              <input
                type="text"
                required
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                placeholder="Enter Organisation Name"
              />

              {/* City */}
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                placeholder="Enter City"
              />

              {/* State */}
              <input
                type="text"
                required
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white"
                placeholder="Enter State"
              />

              {/* PAN */}
              <input
                type="text"
                required
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white uppercase"
                placeholder="Enter PAN Number"
                maxLength={10}
              />

              {/* GST */}
              <input
                type="text"
                required
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white uppercase"
                placeholder="Enter GST"
                maxLength={15}
              />

              {/* Message */}
              <textarea
                required
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all resize-none bg-white"
                placeholder="Tell us message"
              />

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Get Started'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
