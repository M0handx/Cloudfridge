import { useAuth } from '../auth/AuthProvider.jsx';
import AuthForm from './AuthForm.jsx';

export default function Register() {
  const { register } = useAuth();
  return (
    <AuthForm
      title="Create your account"
      submitLabel="Create account"
      minPassword={8}
      onSubmit={register}
      footer={{ text: 'Already have an account?', to: '/login', link: 'Log in' }}
    />
  );
}
