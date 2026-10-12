import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { looksOffline } from '../lib/validation';
import { logIn } from '../rooms/api';
import { OFFLINE_TEXT } from './EmailScreen';

type Props = { onBack: () => void; onForgot: () => void };

// Nickname and password. On success App sees the account and moves on by itself.
export function LoginScreen({ onBack, onForgot }: Props) {
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordBox = useRef<TextInput>(null);

  async function submit() {
    if (!nickname.trim() || !password) {
      setError('Type your nickname and password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await logIn(nickname.trim(), password);
      if (result === 'wrong') setError("That nickname and password don't match. Check them and try again.");
      if (result === 'locked') setError('Too many wrong tries. Wait 15 minutes, or reset your password.');
    } catch (e) {
      setError(looksOffline((e as Error).message) ? OFFLINE_TEXT : "We couldn't log you in. Try again in a moment.");
    }
    setBusy(false);
  }

  return (
    <AuthLayout
      title="Log in"
      onBack={onBack}
      footer={
        <>
          <Button label="Log in" variant="primary" loading={busy} onPress={() => void submit()} />
          <Button label="Forgot your password?" variant="quiet" disabled={busy} onPress={onForgot} />
        </>
      }
    >
      <TextField
        label="Nickname"
        value={nickname}
        onChangeText={(t) => {
          setNickname(t);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        onSubmitEditing={() => passwordBox.current?.focus()}
        autoFocus
      />
      <TextField
        ref={passwordBox}
        label="Password"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          setError(null);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        error={error}
      />
    </AuthLayout>
  );
}
