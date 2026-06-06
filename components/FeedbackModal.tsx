"use client";

import { useState } from "react";
import { submitFeedback } from "@/app/actions";

export default function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState("Suggestion");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    setFeedback(null);
    
    const formData = new FormData();
    formData.append("type", type);
    formData.append("message", message);
    if (image) formData.append("image", image);
    
    const res = await submitFeedback(formData);
    setIsSubmitting(false);
    
    if (res?.error) {
      setFeedback({ type: "error", text: res.error });
    } else {
      setFeedback({ type: "success", text: "Thank you for your feedback!" });
      setMessage("");
      setType("Suggestion");
      setImage(null);
      setTimeout(() => {
        setIsOpen(false);
        setFeedback(null);
      }, 2000);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
      >
        Feedback
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 transition-opacity">
          <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 text-white shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">Submit Feedback</h2>
              <button onClick={() => setIsOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-700 hover:text-white">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            {feedback && (
              <div className={`mb-4 px-3 py-2 rounded text-sm font-medium ${feedback.type === "error" ? "bg-red-900/50 text-red-300 border border-red-800" : "bg-green-900/50 text-green-300 border border-green-800"}`}>
                {feedback.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-gray-400">
                Found a bug? Have a suggestion? Let us know below!
              </p>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border border-gray-600 bg-gray-800 p-2 text-sm text-white focus:border-pink-500 focus:outline-none">
                <option value="Bug">Bug Report</option>
                <option value="Suggestion">Feature Suggestion</option>
                <option value="Other">Other</option>
              </select>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I noticed that..." rows={4} className="w-full rounded-md border border-gray-600 bg-gray-800 p-2 text-white focus:border-pink-500 focus:outline-none resize-none" required />
              
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Optional Screenshot</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700 hover:file:text-white cursor-pointer transition-colors"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="rounded px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting || !message.trim()} className="rounded bg-pink-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-pink-700 disabled:opacity-50">
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}