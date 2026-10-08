import { useState } from 'react';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { supabase } from '../lib/supabase';
import { NICKNAME_MAX, NICKNAME_PROBLEM_TEXT, looksOffline, nicknameProblem } from '../lib/validation';
import { OFFLINE_TEXT } from './EmailScreen';

type Props = { onSaved: () => void; onBack: () => void };

export function NicknameScreen({ onSaved, onBack }: Props) {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const problem = nicknameProblem(nickname);
    if (problem) {
      setError(NICKNAME_PROBLEM_TEXT[problem]);
      return;
    }
    setBusy(true);
    setError(null);
    const { error: saveError } = await supabase.rpc('set_nickname', { new_nickname: nickname.trim() });
    setBusy(false);
    if (saveError) {
      if (saveError.message.includes('nickname_taken')) setError('Someone already has that nickname. Try another.');
      else if (saveError.message.includes('reserved_nickname')) setError(NICKNAME_PROBLEM_TEXT.reserved);
      else if (saveError.message.includes('invalid_nickname')) setError(NICKNAME_PROBLEM_TEXT.badCharacters);
      else setError(looksOffline(saveError.message) ? OFFLINE_TEXT : "We couldn't save that. Try again.");
      return;
    }
    onSaved();
  }

  return (
    <AuthLayout
      title="Pick a nickname"
      body="It's the only name people in Circles will see. Don't use your real name or your number."
      onBack={onBack}
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
        maxLength={NICKNAME_MAX}
        helper={`Letters, numbers and _ only, up to ${NICKNAME_MAX} characters.`}
        error={error}
        returnKeyType="done"
        onSubmitEditing={() => void save()}
        autoFocus
      />
    </AuthLayout>
  );
}
