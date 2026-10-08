import { useRef, useState } from 'react';
import { TextInput, View } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { ErrorLine } from '../components/ErrorLine';
import { supabase } from '../lib/supabase';
import { looksOffline, parseDateOfBirth, toIsoDate } from '../lib/validation';
import { OFFLINE_TEXT } from './EmailScreen';
import { space } from '../theme';

type Props = { onSaved: () => void; onBack: () => void };

// New accounts only: asked once, after the email code and before the nickname (docs/design/pages/age-check.md).
export function AgeScreen({ onSaved, onBack }: Props) {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const complete = parseDateOfBirth(day, month, year) !== null;

  async function save() {
    const dob = parseDateOfBirth(day, month, year);
    if (!dob) {
      setError('Check the date.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: saveError } = await supabase.rpc('set_date_of_birth', { dob: toIsoDate(dob) });
    setBusy(false);
    if (saveError) {
      if (saveError.message.includes('already_set')) {
        setError("You've already told us your date of birth.");
        onSaved();
        return;
      }
      setError(
        saveError.message.includes('invalid_date')
          ? 'Check the date.'
          : looksOffline(saveError.message)
            ? OFFLINE_TEXT
            : "We couldn't save that. Try again.",
      );
      return;
    }
    onSaved();
  }

  const digitsOnly = (t: string) => t.replace(/\D/g, '');

  return (
    <AuthLayout
      title="When were you born?"
      body="Circles is for people 18 and over. We don't show your age to anyone."
      onBack={onBack}
      backHint="Takes you back to the start"
      footer={
        <Button label="Continue" variant="primary" loading={busy} disabled={!complete} onPress={() => void save()} />
      }
    >
      <View style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', gap: space[3] }}>
          <TextField
            label="Day"
            value={day}
            onChangeText={(t) => {
              const v = digitsOnly(t).slice(0, 2);
              setDay(v);
              setError(null);
              if (v.length === 2) monthRef.current?.focus();
            }}
            placeholder="DD"
            invalid={!!error}
            keyboardType="number-pad"
            maxLength={2}
            style={{ flex: 1 }}
            autoFocus
          />
          <TextField
            ref={monthRef}
            label="Month"
            value={month}
            onChangeText={(t) => {
              const v = digitsOnly(t).slice(0, 2);
              setMonth(v);
              setError(null);
              if (v.length === 2) yearRef.current?.focus();
            }}
            placeholder="MM"
            invalid={!!error}
            keyboardType="number-pad"
            maxLength={2}
            style={{ flex: 1 }}
          />
          <TextField
            ref={yearRef}
            label="Year"
            value={year}
            onChangeText={(t) => {
              setYear(digitsOnly(t).slice(0, 4));
              setError(null);
            }}
            placeholder="YYYY"
            invalid={!!error}
            keyboardType="number-pad"
            maxLength={4}
            style={{ flex: 1.4 }}
          />
        </View>
        {error ? <ErrorLine message={error} /> : null}
      </View>
    </AuthLayout>
  );
}
