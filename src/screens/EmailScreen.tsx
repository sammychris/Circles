import { useState } from 'react';
import { Button } from '../components/Button';
import { AuthLayout } from '../components/AuthLayout';
import { TextField } from '../components/TextField';
import { supabase } from '../lib/supabase';
import { isValidEmail } from '../lib/validation';

export const OFFLINE_TEXT = "You're offline. Connect to the internet, then try again.";

// Supabase reports "no connection" with no status (or 0).
export function isOffline(status: number | undefined): boolean {
  return !status;
}

export function friendlyAuthError(status: number | undefined): string {
  if (status === 429) return 'Too many tries. Wait a few minutes, then try again.';
  if (isOffline(status)) return OFFLINE_TEXT;
  return "We couldn't send the code. Try again in a moment.";
}

// signIn: someone who added an email before, signing back in. add: saving an email to this account.
export type EmailPurpose = 'signIn' | 'add';

type Props = {
  purpose: EmailPurpose;
  initialEmail: string;
  onBack: () => void;
  onCodeSent: (email: string) => void;
};

export async function sendEmailCode(purpose: EmailPurpose, email: string) {
  if (purpose === 'add') return (await supabase.auth.updateUser({ email })).error;
  return (await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })).error;
}

export function EmailScreen({ purpose, initialEmail, onBack, onCodeSent }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    const clean = email.trim().toLowerCase();
    if (!isValidEmail(clean)) {
      setError('Check your email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const sendError = await sendEmailCode(purpose, clean);
    setBusy(false);
    if (sendError) {
      if (purpose === 'signIn' && sendError.status === 422) {
        // No account with that email. Carry on as if we sent one, so nobody can test which emails use Circles.
        onCodeSent(clean);
      } else if (purpose === 'add' && sendError.status === 422) {
        setError('That email is already used by another account.');
      } else {
        setError(friendlyAuthError(sendError.status));
      }
      return;
    }
    onCodeSent(clean);
  }

  return (
    <AuthLayout
      title={purpose === 'add' ? 'Add your email' : "What's your email?"}
      body={
        purpose === 'add'
          ? "If you change or lose your phone, you can sign back in and keep your nickname. Nobody else ever sees your email."
          : "Use the email you added to your account. We'll send you a code. Nobody else ever sees your email."
      }
      onBack={onBack}
      footer={<Button label="Send me a code" variant="primary" loading={busy} onPress={() => void sendCode()} />}
    >
      <TextField
        label="Email"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          setError(null);
        }}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => void sendCode()}
        error={error}
        autoFocus
      />
    </AuthLayout>
  );
}
