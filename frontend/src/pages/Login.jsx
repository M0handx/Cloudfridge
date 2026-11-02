import { useAuth } from '../auth/AuthProvider.jsx';
import AuthForm from './AuthForm.jsx';

export default function Login() {
  const { login } = useAuth();
  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      onSubmit={login}
      footer={{ text: 'New here?', to: '/register', link: 'Create an account' }}
    />
  );
}
