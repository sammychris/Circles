import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { CodeScreen } from './CodeScreen';
import { EmailScreen } from './EmailScreen';
import { LinkPreviewScreen } from './LinkPreviewScreen';
import { LoginScreen } from './LoginScreen';
import { SignUpScreen } from './SignUpScreen';
import { WelcomeScreen } from './WelcomeScreen';

type Stage = { name: 'welcome' } | { name: 'signup' } | { name: 'login' } | { name: 'email' } | { name: 'code'; email: string };

// Signed out. Get started opens Sign up (nickname and password); Log in and Sign up link to each other.
// A forgotten password is reset with the email added to the account. The age is asked inside the app.
type Props = {
  // A room link someone opened. They see the room first, then sign up and go straight in.
  linkRoom?: { roomId: string; by?: string };
  // The room from the link has ended: after signing up, find them another room.
  onLinkEnded?: () => void;
};

export function SignInFlow({ linkRoom, onLinkEnded }: Props) {
  const [stage, setStage] = useState<Stage>({ name: 'welcome' });
  const [email, setEmail] = useState('');
  // Android back: code → email → Log in → Welcome (not out of the app).
  useEffect(() => {
    if (stage.name === 'welcome') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStage(stage.name === 'code' ? { name: 'email' } : stage.name === 'email' ? { name: 'login' } : { name: 'welcome' });
      return true;
    });
    return () => sub.remove();
  }, [stage.name]);

  if (stage.name === 'welcome' && linkRoom) {
    return (
      <LinkPreviewScreen
        roomId={linkRoom.roomId}
        by={linkRoom.by}
        starting={false}
        error={null}
        onJoin={() => setStage({ name: 'signup' })}
        onFindAnother={() => {
          onLinkEnded?.();
          setStage({ name: 'signup' });
        }}
        onHaveAccount={() => setStage({ name: 'login' })}
      />
    );
  }
  if (stage.name === 'welcome') {
    return (
      <WelcomeScreen
        starting={false}
        error={null}
        onStart={() => setStage({ name: 'signup' })}
        onHaveAccount={() => setStage({ name: 'login' })}
      />
    );
  }
  if (stage.name === 'login') {
    return (
      <LoginScreen
        onBack={() => setStage({ name: 'welcome' })}
        onForgot={() => setStage({ name: 'email' })}
        onSignUp={() => setStage({ name: 'signup' })}
      />
    );
  }
  if (stage.name === 'signup') {
    return <SignUpScreen onBack={() => setStage({ name: 'welcome' })} onLogIn={() => setStage({ name: 'login' })} />;
  }
  if (stage.name === 'email') {
    return (
      <EmailScreen
        purpose="reset"
        initialEmail={email}
        onBack={() => setStage({ name: 'login' })}
        onCodeSent={(sentTo) => {
          setEmail(sentTo);
          setStage({ name: 'code', email: sentTo });
        }}
      />
    );
  }
  return <CodeScreen purpose="reset" email={stage.email} onBack={() => setStage({ name: 'email' })} />;
}
