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

type Props = { initialEmail: string; onBack: () => void; onCodeSent: (email: string) => void };

export function EmailScreen({ initialEmail, onBack, onCodeSent }: Props) {
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
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (sendError) {
      setError(friendlyAuthError(sendError.status));
      return;
    }
    onCodeSent(clean);
  }

  return (
    <AuthLayout
      title="What's your email?"
      body="We'll send you a code to check it's you. Nobody else ever sees your email."
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
