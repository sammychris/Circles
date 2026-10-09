import { useEffect, useRef, useState } from 'react';
import { BackHandler, type TextInput } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { EMAIL_ENABLED } from '../config';
import { supabase } from '../lib/supabase';
import { NICKNAME_MAX, NICKNAME_PROBLEM_TEXT, isValidEmail, looksOffline, nicknameProblem } from '../lib/validation';
import { CodeScreen } from './CodeScreen';
import { OFFLINE_TEXT, friendlyAuthError, sendEmailCode } from './EmailScreen';

type Props = { onSaved: () => void; onBack: () => void };

// The nickname, and an optional email (Sammy, 2026-10-08) so people can log back in after a new
// phone or a reinstall. With an email, a code is sent to check it's theirs before they go in.
export function NicknameScreen({ onSaved, onBack }: Props) {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The nickname is saved once; if the email then needs another try, it isn't saved again.
  const [saved, setSaved] = useState(false);
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const emailBox = useRef<TextInput>(null);
  // Android back on the code screen: back to the email box (not out of the app).
  useEffect(() => {
    if (!codeSentTo) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setCodeSentTo(null);
      return true;
    });
    return () => sub.remove();
  }, [codeSentTo]);

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
    const clean = email.trim().toLowerCase();
    if (clean && !isValidEmail(clean)) {
      setEmailError('Check your email address, or leave it empty.');
      return;
    }
    setBusy(true);
    setError(null);
    setEmailError(null);
    const ok = await saveNickname();
    if (!ok) {
      setBusy(false);
      return;
    }
    if (!clean) {
      setBusy(false);
      onSaved();
      return;
    }
    const sendError = await sendEmailCode('add', clean);
    setBusy(false);
    // 422: already on another account. Carry on as if a code was sent, so nobody can test which emails
    // use Circles (the code screen says so).
    if (sendError && sendError.status !== 422) {
      setEmailError(friendlyAuthError(sendError.status));
      return;
    }
    setCodeSentTo(clean);
  }

  if (codeSentTo) {
    // Back from the code: change the email, or go on without it (it can be added later in Me).
    return <CodeScreen purpose="add" email={codeSentTo} onBack={() => setCodeSentTo(null)} onDone={onSaved} />;
  }

  return (
    <AuthLayout
      title="Pick a nickname"
      body="It's the only name people in Circles will see. Don't use your real name or your number."
      // Once the nickname is saved, going back would throw the account away, so there's no Back.
      onBack={saved ? undefined : onBack}
      backHint="Takes you back to the start"
      footer={
        <>
          <Button label="Continue" variant="primary" loading={busy} onPress={() => void save()} />
          {saved ? <Button label="Continue without email" variant="quiet" disabled={busy} onPress={onSaved} /> : null}
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
        maxLength={NICKNAME_MAX}
        helper={saved ? 'Saved. This is your nickname.' : `Letters, numbers and _ only, up to ${NICKNAME_MAX} characters.`}
        error={error}
        editable={!saved}
        returnKeyType={EMAIL_ENABLED ? 'next' : 'done'}
        onSubmitEditing={() => (EMAIL_ENABLED ? emailBox.current?.focus() : void save())}
        autoFocus
      />
      {EMAIL_ENABLED ? (
        <TextField
          ref={emailBox}
          label="Email (optional)"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            setEmailError(null);
          }}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          helper="So you can log back in on a new phone. We'll send a code. Nobody else sees it."
          error={emailError}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
      ) : null}
    </AuthLayout>
  );
}
