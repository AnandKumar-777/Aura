import AuthForm from '@/components/auth/AuthForm';

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-headline text-center mb-2 font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-violet-400">AURA</h1>
      <p className="text-center text-muted-foreground">Log in to share your moments.</p>
      <AuthForm type="login" />
    </div>
  );
}
