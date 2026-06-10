import { useState, type FormEvent } from 'react';
import { Field } from '../ui/Form';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useChannels } from '../../lib/useChannels';
import { useToast } from '../ui/Toast';

/**
 * Form kết nối WordPress bằng Application Password (WP self-host 5.6+).
 *
 * Vì sao Application Password? WordPress .org không có OAuth tập trung như
 * Facebook/TikTok. User tạo App Password trong WP (Users → Profile →
 * Application Passwords) rồi nhập vào đây; backend verify qua REST API.
 */
export function WordpressConnectForm({ onDone }: { onDone?: () => void }) {
  const { connectWordpress } = useChannels();
  const toast = useToast();

  const [siteUrl, setSiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await connectWordpress({ siteUrl, username, appPassword });
      toast('success', 'Đã kết nối WordPress');
      setSiteUrl('');
      setUsername('');
      setAppPassword('');
      onDone?.();
    } catch (err) {
      // Backend trả 401 kèm message khi sai thông tin / không gọi được site.
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Kết nối WordPress thất bại';
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3">
      <Field label="Site URL" required>
        {({ id, invalid }) => (
          <Input
            id={id}
            type="url"
            placeholder="https://blog-cua-ban.com"
            value={siteUrl}
            invalid={invalid}
            required
            onChange={(e) => setSiteUrl(e.target.value)}
          />
        )}
      </Field>

      <Field label="Username" required>
        {({ id, invalid }) => (
          <Input
            id={id}
            placeholder="admin"
            value={username}
            invalid={invalid}
            required
            autoComplete="username"
            onChange={(e) => setUsername(e.target.value)}
          />
        )}
      </Field>

      <Field
        label="Application Password"
        required
        hint="Tạo trong WordPress: Users → Profile → Application Passwords."
      >
        {({ id, invalid }) => (
          <Input
            id={id}
            type="password"
            placeholder="xxxx xxxx xxxx xxxx"
            value={appPassword}
            invalid={invalid}
            required
            autoComplete="off"
            onChange={(e) => setAppPassword(e.target.value)}
          />
        )}
      </Field>

      {error && <p className="text-label text-red-500">{error}</p>}

      <Button type="submit" loading={busy} className="self-start">
        Kết nối WordPress
      </Button>
    </form>
  );
}
