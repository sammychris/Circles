import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { supabase } from '../lib/supabase';
import { NICKNAME_MAX, NICKNAME_PROBLEM_TEXT, PASSWORD_MIN, looksOffline, nicknameProblem } from '../lib/validation';
import { setPassword } from '../rooms/api';
import { OFFLINE_TEXT } from './EmailScreen';

type Props = { onSaved: () => void; onBack: () => void };

// The nickname and a password (Sammy, 2026-10-11): together they log you back in on any phone.
export function NicknameScreen({ onSaved, onBack }: Props) {
  const [nickname, setNickname] = useState('');
  const [password, setPasswordText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The nickname is saved once; if the password then needs another try, it isn't saved again.
  const [saved, setSaved] = useState(false);
  const passwordBox = useRef<TextInput>(null);

  async function saveNickname(): Promise<boolean> {
    if (saved) return true;
    const problem = nicknameProblem(nickname);
    if (problem) {
      setError(NICKNAME_PROBLEM_TEXT[problem]);
      return false;
    }
    const { error: saveError } = await supabase.rpc('set_nickname', { new_nickname: nickname.trim() });
    if (saveError) {
      if (saveError.message.includes('nickname_taken')) setError('Someone already has that nickname. Try another.');
      else if (saveError.message.includes('reserved_nickname')) setError(NICKNAME_PROBLEM_TEXT.reserved);
      else if (saveError.message.includes('invalid_nickname')) setError(NICKNAME_PROBLEM_TEXT.badCharacters);
      else setError(looksOffline(saveError.message) ? OFFLINE_TEXT : "We couldn't save that. Try again.");
      return false;
    }
    setSaved(true);
    return true;
  }

  async function save() {
    if (password.length < PASSWORD_MIN) {
      setPasswordError(`Use at least ${PASSWORD_MIN} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    setPasswordError(null);
    if (!(await saveNickname())) {
      setBusy(false);
      return;
    }
    try {
      await setPassword(password);
    } catch (e) {
      setBusy(false);
      setPasswordError(looksOffline((e as Error).message) ? OFFLINE_TEXT : "We couldn't save your password. Try again.");
      return;
    }
    setBusy(false);
    onSaved();
  }

  return (
    <AuthLayout
      title="Pick a nickname"
      body="It's the only name people in Circles will see. Don't use your real name or your number."
      // Once the nickname is saved, going back would throw the account away, so there's no Back.
      onBack={saved ? undefined : onBack}
      backHint="Takes you back to the start"
      footer={<Button label="Continue" variant="primary" loading={busy} onPress={() => void save()} />}
    >
      <TextField
        label="Nickname"
        value={nickname}
        onChangeText={(t) => {
          setNickname(t);
          setError(null);
        }}
        placeholder="For example, NightOwl_22"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        maxLength={NICKNAME_MAX}
        helper={saved ? 'Saved. This is your nickname.' : `Letters, numbers and _ only, up to ${NICKNAME_MAX} characters.`}
        error={error}
        editable={!saved}
        returnKeyType="next"
        onSubmitEditing={() => passwordBox.current?.focus()}
        autoFocus
      />
      <TextField
        ref={passwordBox}
        label="Password"
        value={password}
        onChangeText={(t) => {
          setPasswordText(t);
          setPasswordError(null);
        }}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={72}
        helper={`At least ${PASSWORD_MIN} characters. You'll log in with your nickname and this password.`}
        error={passwordError}
        returnKeyType="done"
        onSubmitEditing={() => void save()}
      />
    </AuthLayout>
  );
}
