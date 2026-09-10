import { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../lib/i18n';
import { canChangeAvatar } from '../../lib/roles';
import UserAvatar from './UserAvatar';

const MAX_SIZE = 2 * 1024 * 1024; // matches the bucket's 2MB limit

/** Avatar upload — owner/admin/moderator/seller only. Buyers/members: letter avatar. */
export default function AvatarUploader({ sizeClass = 'w-10' }: { sizeClass?: string }) {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!user || !profile) return null;

  const canEdit = canChangeAvatar(profile.role);

  const pick = () => {
    if (!canEdit) return;
    inputRef.current?.click();
  };

  const upload = async (file: File) => {
    if (!canEdit) return;
    setError('');
    if (file.size > MAX_SIZE) {
      setError(t('الحد الأقصى 2 ميغابايت', 'Max size is 2MB'));
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (dbErr) throw dbErr;

      setProfile({ ...profile, avatar_url: url });
    } catch {
      setError(t('فشل رفع الصورة. حاول مجدداً أو جرّب ملفاً أصغر.', 'Upload failed. Try again or use a smaller file.'));
    }
    setBusy(false);
  };

  const removeAvatar = async () => {
    if (!canEdit) return;
    setError('');
    setBusy(true);
    try {
      await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id);
      setProfile({ ...profile, avatar_url: null });
    } catch {
      setError(t('تعذر الحذف', 'Could not remove'));
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <UserAvatar
          name={profile.full_name}
          email={profile.email}
          avatarUrl={canEdit ? profile.avatar_url : null}
          sizeClass={sizeClass}
        />
        {busy && (
          <div
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white"
            aria-hidden
          >
            <Loader2 size={28} className="animate-spin" />
          </div>
        )}
        {canEdit ? (
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = '';
            }}
          />
        ) : null}
      </div>
      {canEdit ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="btn btn-sm btn-outline gap-1.5 min-h-10"
          >
            <Camera size={14} aria-hidden />
            {t('تغيير الصورة', 'Change photo')}
          </button>
          {profile.avatar_url ? (
            <button
              type="button"
              onClick={() => void removeAvatar()}
              disabled={busy}
              className="btn btn-sm btn-ghost text-error gap-1.5 min-h-10"
            >
              <Trash2 size={14} aria-hidden />
              {t('إزالة', 'Remove')}
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="text-error text-xs text-center max-w-[16rem]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
