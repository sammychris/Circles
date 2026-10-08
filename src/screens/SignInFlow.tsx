import { useState } from 'react';
import { CodeScreen } from './CodeScreen';
import { EmailScreen } from './EmailScreen';
import { WelcomeScreen } from './WelcomeScreen';

type Stage = { name: 'welcome' } | { name: 'email' } | { name: 'code'; email: string };

// Signed out: Welcome, then email, then the code from the email.
export function SignInFlow() {
  const [stage, setStage] = useState<Stage>({ name: 'welcome' });
  const [email, setEmail] = useState('');

  if (stage.name === 'welcome') return <WelcomeScreen onStart={() => setStage({ name: 'email' })} />;
  if (stage.name === 'email') {
    return (
      <EmailScreen
        initialEmail={email}
        onBack={() => setStage({ name: 'welcome' })}
        onCodeSent={(sentTo) => {
          setEmail(sentTo);
          setStage({ name: 'code', email: sentTo });
        }}
      />
    );
  }
  return <CodeScreen email={stage.email} onBack={() => setStage({ name: 'email' })} />;
}
