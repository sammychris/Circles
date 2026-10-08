import { useState } from 'react';
import { CodeScreen } from './CodeScreen';
import { EmailScreen } from './EmailScreen';

// Optional: saves an email to this account so the person can sign back in on another phone.
export function AddEmailFlow({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  if (!sentTo) {
    return (
      <EmailScreen
        purpose="add"
        initialEmail={email}
        onBack={onClose}
        onCodeSent={(address) => {
          setEmail(address);
          setSentTo(address);
        }}
      />
    );
  }
  return <CodeScreen purpose="add" email={sentTo} onBack={() => setSentTo(null)} onDone={onAdded} />;
}
