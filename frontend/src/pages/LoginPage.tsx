import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Form';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../lib/useAuth';

type Mode = 'login' | 'register';

function extractError(err: unknown): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const m = e.response?.data?.message;
  if (Array.isArray(m)) return m[0];
  return m ?? 'Có lỗi xảy ra, vui lòng thử lại.';
}

export function LoginPage() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Đã đăng nhập rồi thì khỏi vào lại trang login
  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register({ name, email, password });
      toast(
        'success',
        mode === 'login' ? 'Đăng nhập thành công' : 'Tạo tài khoản thành công',
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast('error', extractError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[400px] rounded-card border border-border bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-button bg-primary text-section font-display font-bold text-primary-foreground">
            M
          </div>
          <h1 className="text-section font-display font-semibold">
            Marketing Hub
          </h1>
          <p className="text-body text-muted-foreground">
            {mode === 'login' ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <Field label="Tên của bạn">
              {({ id }) => (
                <Input
                  id={id}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: An Nguyễn"
                  required
                />
              )}
            </Field>
          )}
          <Field label="Email">
            {({ id }) => (
              <Input
                id={id}
                type="email"
                placeholder="ban@congty.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            )}
          </Field>
          <Field
            label="Mật khẩu"
            hint={mode === 'register' ? 'Tối thiểu 6 ký tự' : undefined}
          >
            {({ id }) => (
              <Input
                id={id}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
              />
            )}
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </Button>
        </form>

        <div className="mt-4 text-center text-label text-muted-foreground">
          {mode === 'login' ? (
            <>
              Chưa có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setMode('register')}
                className="cursor-pointer font-medium text-primary hover:underline"
              >
                Đăng ký
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => setMode('login')}
                className="cursor-pointer font-medium text-primary hover:underline"
              >
                Đăng nhập
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
