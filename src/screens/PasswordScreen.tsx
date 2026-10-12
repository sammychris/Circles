import { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { PASSWORD_MIN, looksOffline } from '../lib/validation';
import { setPassword } from '../rooms/api';
import { OFFLINE_TEXT } from './EmailScreen';

// Sets or changes the password, from Me or straight after a password reset email.
export function PasswordScreen({ title, onClose, onSaved }: { title: string; onClose: () => void; onSaved: () => void }) {
  const [password, setPasswordText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (password.length < PASSWORD_MIN) {
      setError(`Use at least ${PASSWORD_MIN} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setPassword(password);
      onSaved();
    } catch (e) {
      setBusy(false);
      setError(looksOffline((e as Error).message) ? OFFLINE_TEXT : "We couldn't save your password. Try again.");
    }
  }

  return (
    <AuthLayout
      title={title}
      body="You'll log in with your nickname and this password."
      onBack={onClose}
      footer={<Button label="Save password" variant="primary" loading={busy} onPress={() => void save()} />}
    >
      <TextField
        label="New password"
        value={password}
        onChangeText={(t) => {
          setPasswordText(t);
          setError(null);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={72}
        helper={`At least ${PASSWORD_MIN} characters.`}
        error={error}
        returnKeyType="done"
        onSubmitEditing={() => void save()}
        autoFocus
      />
    </AuthLayout>
  );
}
