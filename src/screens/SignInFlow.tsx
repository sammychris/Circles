import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CodeScreen } from './CodeScreen';
import { EmailScreen, OFFLINE_TEXT, isOffline } from './EmailScreen';
import { WelcomeScreen } from './WelcomeScreen';

type Stage = { name: 'welcome' } | { name: 'email' } | { name: 'code'; email: string };

// Signed out. Get started makes a new account straight away (open test: no email needed).
// "I already have an account" signs back in with the email that was added to it.
export function SignInFlow() {
  const [stage, setStage] = useState<Stage>({ name: 'welcome' });
  const [email, setEmail] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);
    const { error: startError } = await supabase.auth.signInAnonymously();
    setStarting(false);
    if (startError) {
      setError(
        startError.status === 429
          ? 'A lot of people are joining right now. Wait a few minutes, then try again.'
          : isOffline(startError.status)
            ? OFFLINE_TEXT
            : "We couldn't start your account. Try again.",
      );
    }
    // On success App sees the new account and moves on to the 18+ question.
  }

  if (stage.name === 'welcome') {
    return (
      <WelcomeScreen
        starting={starting}
        error={error}
        onStart={() => void start()}
        onHaveAccount={() => setStage({ name: 'email' })}
      />
    );
  }
  if (stage.name === 'email') {
    return (
      <EmailScreen
        purpose="signIn"
        initialEmail={email}
        onBack={() => setStage({ name: 'welcome' })}
        onCodeSent={(sentTo) => {
          setEmail(sentTo);
          setStage({ name: 'code', email: sentTo });
        }}
      />
    );
  }
  return <CodeScreen purpose="signIn" email={stage.email} onBack={() => setStage({ name: 'email' })} />;
}
