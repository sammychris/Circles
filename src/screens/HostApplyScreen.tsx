import { useState } from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Button } from '../components/Button';
import { RadioRow } from '../components/Choice';
import { DoorLayout } from '../components/DoorLayout';
import { FilterChip } from '../components/FilterChip';
import { Text } from '../components/Text';
import { TextField } from '../components/TextField';
import { LANGUAGES, TOPICS, submitApplication, type HostKind } from '../support/api';
import { AGREEMENT, QUIZ, TRAINING } from '../support/training';
import { size, space, useColors } from '../theme';

type Step = 'intro' | 'form' | 'training' | 'quiz' | 'agree' | 'sent';

const INTRO_MAX = 150;
const WHY_MAX = 500;

// Become a host (support-section-spec.md › Become a host): what hosts do, one short form, a short
// training with a 5-question check, the host agreement, then the Circles team reviews it.
// 18+ is already checked for everyone at sign-up, and again by the database.
export function HostApplyScreen({ onClose }: { onClose: () => void }) {
  const colors = useColors();
  const [step, setStep] = useState<Step>('intro');
  const [kind, setKind] = useState<HostKind>('listener');
  const [intro, setIntro] = useState('');
  const [why, setWhy] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [fullName, setFullName] = useState('');
  const [credential, setCredential] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [licence, setLicence] = useState('');
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(QUIZ.map(() => null));
  const [checked, setChecked] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (list: string[], set: (l: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const pro = kind === 'professional';
  const formOk =
    intro.trim().length >= 10 &&
    intro.trim().length <= INTRO_MAX &&
    why.trim().length >= 10 &&
    topics.length > 0 &&
    languages.length > 0 &&
    (!pro || (fullName.trim().length >= 3 && credential.trim().length >= 2 && issuingBody.trim().length >= 2 && licence.trim().length >= 2));
  const allRight = answers.every((a, i) => a === QUIZ[i].answer);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitApplication({
        kind,
        intro: intro.trim(),
        topics,
        languages,
        why: why.trim(),
        ...(pro ? { fullName: fullName.trim(), credential: credential.trim(), issuingBody: issuingBody.trim(), licenceNumber: licence.trim() } : {}),
      });
      setStep('sent');
    } catch (e) {
      const m = e instanceof Error ? e.message : '';
      setError(
        m.includes('adults_only')
          ? 'Hosts must be 18 or over. Join a room first, and answer the age question there.'
          : m.includes('already_pending')
          ? 'You already have an application waiting. We’ll review it soon.'
          : m.includes('already_host')
            ? "You're already a host."
            : "That didn't send. Check that you're online and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (step === 'intro') {
    return (
      <DoorLayout
        title="Become a host"
        line="Hosts listen, support and keep rooms safe. You don't give medical advice."
        onBack={onClose}
        backLabel="Back"
        footer={<Button label="Start" variant="primary" onPress={() => setStep('form')} />}
      >
        <View style={{ gap: space[3] }}>
          {[
            'Run free support rooms. A room starts once you and 2 others are in.',
            'Bring people in to speak, mute or remove anyone unkind, and use "May be in danger" when someone needs help now.',
            'After 5 support rooms, you can offer one-on-one sessions. Professionals can offer them, and set a price, once their licence is checked.',
            'It takes about 20 minutes to apply: a short form, a short training and the host agreement. The team reviews it within 48 hours.',
          ].map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: space[3] }}>
              <Check size={size.icon} color={colors.live} strokeWidth={size.iconStroke} />
              <Text variant="body" style={{ flex: 1 }}>
                {line}
              </Text>
            </View>
          ))}
        </View>
      </DoorLayout>
    );
  }

  if (step === 'form') {
    return (
      <DoorLayout
        title="About you"
        line="Shown on your host card, with your nickname."
        onBack={() => setStep('intro')}
        backLabel="Back"
        footer={<Button label="Next: training" variant="primary" disabled={!formOk} onPress={() => setStep('training')} />}
      >
        <View style={{ gap: space[2] }}>
          <Text variant="heading">I am</Text>
          <RadioRow title="A trained listener" line="A volunteer. Always free." selected={!pro} onPress={() => setKind('listener')} />
          <RadioRow
            title="A professional"
            line="A licensed counsellor, therapist or doctor. Your real name and licence are shown."
            selected={pro}
            onPress={() => setKind('professional')}
          />
        </View>
        {pro ? (
          <View style={{ gap: space[3] }}>
            <TextField label="Your full name" value={fullName} onChangeText={setFullName} maxLength={80} autoComplete="name" />
            <TextField label="Your qualification" helper="For example: Clinical psychologist" value={credential} onChangeText={setCredential} maxLength={120} />
            <TextField label="Licensed by" helper="For example: MDCN" value={issuingBody} onChangeText={setIssuingBody} maxLength={120} />
            <TextField label="Licence number" helper="The team checks it before you're approved." value={licence} onChangeText={setLicence} maxLength={60} />
          </View>
        ) : null}
        <TextField
          label="A short intro"
          helper={`${intro.trim().length} of ${INTRO_MAX}. For example: "I've been through burnout and I'm here to listen."`}
          value={intro}
          onChangeText={setIntro}
          maxLength={INTRO_MAX}
          multiline
        />
        <View style={{ gap: space[2] }}>
          <Text variant="heading">Topics you're comfortable with</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {TOPICS.map((t) => (
              <FilterChip key={t} label={t} selected={topics.includes(t)} onPress={() => toggle(topics, setTopics, t)} />
            ))}
          </View>
        </View>
        <View style={{ gap: space[2] }}>
          <Text variant="heading">Languages you speak</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {LANGUAGES.map((l) => (
              <FilterChip key={l} label={l} selected={languages.includes(l)} onPress={() => toggle(languages, setLanguages, l)} />
            ))}
          </View>
        </View>
        <TextField label="Why do you want to host?" helper="Only the Circles team sees this." value={why} onChangeText={setWhy} maxLength={WHY_MAX} multiline />
      </DoorLayout>
    );
  }

  if (step === 'training') {
    const card = TRAINING[page];
    const last = page === TRAINING.length - 1;
    return (
      <DoorLayout
        title={card.title}
        line={`Training ${page + 1} of ${TRAINING.length}`}
        onBack={() => (page === 0 ? setStep('form') : setPage(page - 1))}
        backLabel="Back"
        footer={
          <Button
            label={last ? 'Next: a short check' : 'Next'}
            variant="primary"
            onPress={() => (last ? setStep('quiz') : setPage(page + 1))}
          />
        }
      >
        <View style={{ gap: space[4] }}>
          {card.points.map((p) => (
            <Text key={p} variant="body">
              {p}
            </Text>
          ))}
        </View>
      </DoorLayout>
    );
  }

  if (step === 'quiz') {
    return (
      <DoorLayout
        title="A short check"
        line="5 questions. Get them all right to go on; wrong ones show why."
        onBack={() => setStep('training')}
        backLabel="Back"
        footer={
          checked && allRight ? (
            <Button label="Next: the host agreement" variant="primary" onPress={() => setStep('agree')} />
          ) : (
            <Button label="Check my answers" variant="primary" disabled={answers.some((a) => a === null)} onPress={() => setChecked(true)} />
          )
        }
      >
        {QUIZ.map((q, i) => (
          <View key={q.question} style={{ gap: space[2] }}>
            <Text variant="bodyStrong">{`${i + 1}. ${q.question}`}</Text>
            {q.options.map((o, j) => (
              <RadioRow
                key={o}
                title={o}
                selected={answers[i] === j}
                onPress={() => {
                  setChecked(false);
                  setAnswers(answers.map((a, k) => (k === i ? j : a)));
                }}
              />
            ))}
            {checked && answers[i] !== q.answer ? (
              <Text variant="meta" color="danger">{`Not quite. ${q.why}`}</Text>
            ) : checked ? (
              <Text variant="meta" color="live">
                Right.
              </Text>
            ) : null}
          </View>
        ))}
      </DoorLayout>
    );
  }

  if (step === 'agree') {
    return (
      <DoorLayout
        title="The host agreement"
        onBack={() => setStep('quiz')}
        backLabel="Back"
        footer={
          <>
            {error ? (
              <Text variant="meta" color="danger" center>
                {error}
              </Text>
            ) : null}
            <Button label="Send my application" variant="primary" disabled={!agreed} loading={busy} onPress={() => void send()} />
          </>
        }
      >
        <View style={{ gap: space[3] }}>
          {AGREEMENT.map((line) => (
            <Text key={line} variant="body">{`• ${line}`}</Text>
          ))}
        </View>
        <RadioRow title="I agree to all of this" selected={agreed} onPress={() => setAgreed(!agreed)} />
      </DoorLayout>
    );
  }

  return (
    <DoorLayout
      title="Thank you"
      line="We'll review your application within 48 hours."
      onBack={onClose}
      backLabel="Back"
      footer={<Button label="Done" variant="primary" onPress={onClose} />}
    >
      <Text variant="body" color="textSoft">
        You can see where it is in Me › Hosting: waiting, approved, or needs changes.
      </Text>
    </DoorLayout>
  );
}
