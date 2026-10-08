import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';
import { supabase } from '../lib/supabase';
import { cleanCode, isCodeComplete } from '../lib/validation';
import { space } from '../theme';
import { OFFLINE_TEXT, friendlyAuthError, isOffline } from './EmailScreen';

const RESEND_SECONDS = 60;

type Props = { email: string; onBack: () => void };

// After a correct code, Supabase signs the person in and App moves on by itself.
export function CodeScreen({ email, onBack }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function verify(value = code) {
    if (!isCodeComplete(value)) {
      setError('Type the whole code from the email.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: value, type: 'email' });
    setBusy(false);
    if (verifyError) {
      setError(
        verifyError.status === 429
          ? friendlyAuthError(429)
          : isOffline(verifyError.status)
            ? OFFLINE_TEXT
            : "That code didn't work. Check it, or ask for a new one.",
      );
    }
  }

  async function resend() {
    if (resending) return;
    setError(null);
    setResent(false);
    setResending(true);
    const { error: sendError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    setResending(false);
    if (sendError) {
      setError(friendlyAuthError(sendError.status));
      return;
    }
    setResent(true);
    setWait(RESEND_SECONDS);
  }

  return (
    <AuthLayout
      title="Check your email"
      body={`We sent a code to ${email}. It can take a minute to arrive. Check your spam folder too.`}
      onBack={onBack}
      footer={<Button label="Continue" variant="primary" loading={busy} onPress={() => void verify()} />}
    >
      <View style={{ gap: space[4] }}>
        <TextField
          label="Code"
          value={code}
          onChangeText={(t) => {
            const next = cleanCode(t);
            setCode(next);
            setError(null);
          }}
          placeholder="123456"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={8}
          error={error}
          autoFocus
        />
        {resent ? (
          <Text variant="meta" color="textSoft" accessibilityLiveRegion="polite">
            We sent a new code.
          </Text>
        ) : null}
        {wait > 0 ? (
          <Text variant="meta" color="textMeta" style={{ fontVariant: ['tabular-nums'] }}>
            {`You can ask for a new code in ${wait} seconds.`}
          </Text>
        ) : (
          <Button label="Send a new code" variant="quiet" loading={resending} onPress={() => void resend()} />
        )}
        <Button label="Use a different email" variant="quiet" onPress={onBack} />
      </View>
    </AuthLayout>
  );
}
