import React, { useState } from 'react';
import { MessageSquarePlus, X, Send } from 'lucide-react';
import { getAuthToken } from '../services/auth';

type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

const typeLabels: Record<FeedbackType, string> = {
  bug: 'Bug 报告',
  feature: '功能建议',
  improvement: '体验改进',
  other: '其他'
};

const FeedbackButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('feature');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type, content: content.trim(), contact: contact.trim() || undefined })
      });
      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          setOpen(false);
          setSubmitted(false);
          setContent('');
          setContact('');
          setType('feature');
        }, 1500);
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-110 transition-all flex items-center justify-center"
        title="意见反馈"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md mx-4 bg-[#1a1d35] border border-white/10 rounded-2xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-bold text-[#e8e4dc]">意见反馈</h3>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white/80 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-3">&#10003;</div>
                <p className="text-[#e6c87a] font-semibold">感谢您的反馈!</p>
                <p className="text-white/50 text-sm mt-1">我们会认真阅读每一条建议</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Type selector */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">反馈类型</label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(typeLabels) as FeedbackType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          type === t
                            ? 'bg-amber-500/20 text-[#e6c87a] border border-amber-500/40'
                            : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {typeLabels[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">反馈内容</label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="请描述您遇到的问题或建议..."
                    rows={4}
                    maxLength={5000}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#e8e4dc] placeholder-white/30 focus:outline-none focus:border-amber-500/40 resize-none"
                  />
                  <div className="text-right text-xs text-white/30 mt-1">{content.length}/5000</div>
                </div>

                {/* Contact (optional) */}
                <div>
                  <label className="text-sm text-white/60 mb-2 block">联系方式 <span className="text-white/30">(可选)</span></label>
                  <input
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="邮箱或其他联系方式，方便我们回复您"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-[#e8e4dc] placeholder-white/30 focus:outline-none focus:border-amber-500/40"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!content.trim() || submitting}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-yellow-600 text-[#1a1d35] hover:from-amber-400 hover:to-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? '提交中...' : '提交反馈'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
