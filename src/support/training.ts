// The short host training (support-section-spec.md › Become a host, step 3). About 15 minutes to read,
// then a 5-question check. Every answer must be right to pass; wrong ones show why, and you try again.

export const TRAINING: { title: string; points: string[] }[] = [
  {
    title: 'What a host does',
    points: [
      'You keep the room kind and safe, and make sure everyone who wants to talk gets a turn.',
      'You listen more than you talk. People came to be heard, not fixed.',
      "You are not a doctor or a therapist, and you don't give medical advice. If you are a professional, you still follow these rules here.",
    ],
  },
  {
    title: 'Listening without judging',
    points: [
      'Let people finish. Silence is fine; give them time.',
      'Say back what you heard: "It sounds like this week has been really heavy."',
      'Ask open questions: "How has that been for you?" Not "Why didn\'t you just leave?"',
      'Don\'t compare ("I had it worse") or rush to advice ("You should…").',
    ],
  },
  {
    title: 'What not to say',
    points: [
      '"Others have it worse", "Just pray about it", "Calm down", or "Everything happens for a reason."',
      'Never promise to keep a secret if someone may be in danger.',
      "Never share anyone's story outside the room.",
    ],
  },
  {
    title: 'When someone may be in danger',
    points: [
      'Signs: talking about ending their life, wanting to disappear, a plan, saying goodbye, or being hurt by someone.',
      'Stay calm and kind. Ask directly: "Are you thinking about ending your life?" Asking does not put the idea there.',
      'Tap their seat, then "May be in danger". The help options open on their phone and the Circles team is told straight away.',
      'Stay with them in the room until they have help. Encourage them to call the number now.',
    ],
  },
  {
    title: 'Keeping the room safe',
    points: [
      'Rooms only start with 3 people, so nobody is alone with one stranger.',
      'Lower hands, mute or remove anyone who is unkind, sexual, or pushing products. Choose the reason honestly.',
      'No phone numbers, social media handles or other apps. Everything stays inside Circles.',
      'Never ask anyone for money in a support room. One-on-one prices are set in the app and agreed before a session, never during.',
    ],
  },
];

export const QUIZ: { question: string; options: string[]; answer: number; why: string }[] = [
  {
    question: 'Someone shares that their week has been awful. What do you say first?',
    options: ['"Others have it worse, be grateful."', '"It sounds like this week has been really heavy."', '"You should take a holiday."'],
    answer: 1,
    why: 'Say back what you heard first. Comparing or advising too early makes people stop talking.',
  },
  {
    question: 'Someone says they want to end their life. What do you do?',
    options: [
      'Change the subject so the room stays positive.',
      'Tell them to message you privately on another app.',
      'Stay calm, ask directly, and tap their seat › "May be in danger".',
    ],
    answer: 2,
    why: 'Asking directly is safe. "May be in danger" opens the help options on their phone and tells the team.',
  },
  {
    question: 'Someone in the room asks for your phone number so you can talk later. What do you do?',
    options: ['Share it if they seem kind.', 'Kindly say no: everything stays in Circles. Mention one-on-one in the app if you offer it.', 'Give them your social media handle instead.'],
    answer: 1,
    why: 'No numbers or handles, ever. One-on-one happens inside Circles, where it is safe for both of you.',
  },
  {
    question: 'When can you ask someone for money?',
    options: ['Never in a support room. Only a one-on-one price set in the app and agreed before the session.', 'When a support room runs long.', 'Halfway through a one-on-one.'],
    answer: 0,
    why: 'Support rooms are always free. A one-on-one price is shown and agreed before it starts, never during.',
  },
  {
    question: 'You are a trained listener. Someone asks which medicine they should take.',
    options: ['Suggest what worked for you.', 'Say you can\'t give medical advice, and encourage them to see a doctor or pharmacist.', 'Look it up and tell them.'],
    answer: 1,
    why: 'Hosts never give medical advice. Point them to a doctor, gently.',
  },
];

export const AGREEMENT = [
  'I will be kind, patient and fair to everyone.',
  'I will never ask for money in a support room, or outside the app.',
  'I will never move anyone to another app, or share phone numbers or handles.',
  'I will never start romantic or sexual contact with anyone I meet as a host.',
  "I won't give medical advice (unless I'm a verified professional, within my field).",
  'If someone may be in danger, I will use "May be in danger" and stay with them.',
  'I understand the Circles team can pause or remove me as a host.',
];
