import { useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { ShowPassword, TextField } from '../components/TextField';
import { NICKNAME_MAX, NICKNAME_PROBLEM_TEXT, PASSWORD_MIN, looksOffline, nicknameProblem } from '../lib/validation';
import { signUp } from '../rooms/api';
import { OFFLINE_TEXT } from './EmailScreen';

// After signing up, the app asks for their look once (App reads this).
export const afterSignUp = { pickLook: false };

// Sign up (Sammy, 2026-10-12): a nickname and a password, like any app. The age is asked inside the
// app, before the first room. "I already have an account" goes to Log in.
export function SignUpScreen({ onBack, onLogIn }: { onBack: () => void; onLogIn: () => void }) {
  const [nickname, setNickname] = useState('');
  const [password, setPasswordText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordBox = useRef<TextInput>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function submit() {
    const problem = nicknameProblem(nickname);
    if (problem) return setError(NICKNAME_PROBLEM_TEXT[problem]);
    if (password.length < PASSWORD_MIN) return setPasswordError(`Use at least ${PASSWORD_MIN} characters.`);
    setBusy(true);
    setError(null);
    setPasswordError(null);
    try {
      afterSignUp.pickLook = true;
      const result = await signUp(nickname.trim(), password);
      if (result !== 'ok') afterSignUp.pickLook = false;
      if (result === 'taken') setError('Someone already has that nickname. Try another.');
      else if (result === 'reserved') setError(NICKNAME_PROBLEM_TEXT.reserved);
      else if (result === 'bad_nickname') setError(NICKNAME_PROBLEM_TEXT.badCharacters);
      else if (result === 'bad_password') setPasswordError(`Use ${PASSWORD_MIN} to 72 characters.`);
      else if (result === 'too_many') setError('A lot of accounts were made from here just now. Wait a while, then try again.');
      // 'ok': the app sees the new account and moves on by itself.
    } catch (e) {
      afterSignUp.pickLook = false;
      setError(looksOffline((e as Error).message) ? OFFLINE_TEXT : "We couldn't make your account. Try again.");
    }
    setBusy(false);
  }

  return (
    <AuthLayout
      title="Create your account"
      body="Pick a nickname. It's the only name people in Circles will see, so don't use your real name or your number."
      onBack={onBack}
      backHint="Takes you back to the start"
      footer={
        <>
          <Button label="Create account" variant="primary" loading={busy} onPress={() => void submit()} />
          <Button label="I already have an account. Log in" variant="quiet" disabled={busy} onPress={onLogIn} />
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
        placeholder="For example, NightOwl_22"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        maxLength={NICKNAME_MAX}
        helper={`Letters, numbers and _ only, up to ${NICKNAME_MAX} characters.`}
        error={error}
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
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={72}
        helper={`At least ${PASSWORD_MIN} characters. To reset it if you forget it, add an email later in Me.`}
        error={passwordError}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      <ShowPassword shown={showPassword} onToggle={() => setShowPassword(!showPassword)} />
    </AuthLayout>
  );
}
