import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Field } from '../components/ui/Form';
import { useToast } from '../components/ui/Toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Demo: chưa nối API auth thật
    setTimeout(() => {
      setLoading(false);
      toast('success', 'Đăng nhập thành công');
      navigate('/dashboard');
    }, 700);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[400px] rounded-card border border-border bg-card p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-button bg-primary text-section text-primary-foreground">
            M
          </div>
          <h1 className="text-section font-semibold">Marketing Hub</h1>
          <p className="text-body text-muted-foreground">Đăng nhập để tiếp tục</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <Field label="Mật khẩu">
            {({ id }) => (
              <Input
                id={id}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            )}
          </Field>
          <Button type="submit" loading={loading} className="w-full">
            Đăng nhập
          </Button>
        </form>

        <div className="mt-4 text-center">
          <a href="#" className="text-label text-primary hover:underline">
            Quên mật khẩu?
          </a>
        </div>
      </div>
    </div>
  );
}
