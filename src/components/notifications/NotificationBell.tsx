import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { UGC_DIR, UGC_TEXT_CLASS, ugcDisplay } from '../../lib/bidi';
import { NOTIFICATION_COLS } from '../../lib/dbCols';
import type { Notification } from '../../types';

export default function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    supabase
      .from('notifications')
      .select(NOTIFICATION_COLS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setNotifications(data as unknown as Notification[]); });
  }, [user]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn btn-ghost btn-md btn-square min-h-11 min-w-11 indicator"
        aria-label={t('الإشعارات', 'Notifications')}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="badge badge-error badge-xs indicator-item top-1.5 end-1.5 border-0">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute end-0 mt-2 w-80 rounded-xl bg-base-200 border border-base-300 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <h3 className="text-sm font-semibold">{t('الإشعارات', 'Notifications')}</h3>
              {unreadCount > 0 && (
                <button type="button" onClick={markAllRead} className="btn btn-ghost btn-xs text-primary">
                  {t('تعليم الكل كمقروء', 'Mark all read')}
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-sm text-base-content/70">
                  {t('لا توجد إشعارات', 'No notifications')}
                </div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-base-300/50 hover:bg-base-300/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-start gap-2">
                      {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                      <div className={!n.is_read ? '' : 'ps-3.5'}>
                        <p className={`text-sm font-medium ${UGC_TEXT_CLASS}`} dir={UGC_DIR}>
                          {ugcDisplay(lang === 'ar' ? n.title_ar || n.title : n.title)}
                        </p>
                        {n.body && (
                          <p className={`text-xs text-base-content/70 mt-0.5 ${UGC_TEXT_CLASS}`} dir={UGC_DIR}>
                            {ugcDisplay(lang === 'ar' ? n.body_ar || n.body : n.body)}
                          </p>
                        )}
                        <p className="text-[10px] text-base-content/55 mt-1">
                          {new Date(n.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
