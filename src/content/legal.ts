// The Privacy Policy and Terms, in plain words. Drafts written for the open test: Sammy should check
// them, and a lawyer should look them over before a wide launch (see docs/BUILD_NOTES.md).
// Everything here must stay true to what the app actually does.

// Sammy's contact address for privacy questions. Until he gives one, the text points to a way that
// works today: a report reaches the Circles team.
export const CONTACT_EMAIL: string | null = null;

export const LEGAL_UPDATED = '8 October 2026';

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

const contactLine = CONTACT_EMAIL
  ? `Write to us at ${CONTACT_EMAIL} with any question about your data.`
  : 'To ask what we hold about you, or to correct it, tap Report in any room, choose "The whole room" and write your question. It comes straight to the Circles team. You can delete your account yourself any time in Me.';

export const PRIVACY: LegalDoc = {
  title: 'Privacy Policy',
  intro:
    "Circles is a place to talk with a few real people by voice. This page says what we keep about you, who can see it, and how to delete it. We've kept it short and plain.",
  sections: [
    {
      heading: 'What other people see',
      paragraphs: [
        'Only the nickname you choose, and a round picture with its first letter. Never your real name, phone number, email or birthday.',
        'Nobody is ever shown that you are in a "Need someone to talk to" room. Not friends, not anyone.',
        "Saves are secret. You only connect with someone when you both save each other, and only you two can see it. Nobody sees who saved whom.",
      ],
    },
    {
      heading: 'What we keep',
      paragraphs: [
        'A random account number that ties your account together. It is not your phone number.',
        'Your nickname, and your date of birth. We use your date of birth only to check you are 18 or over. We never show it to anyone.',
        'Your email, only if you choose to add one.',
        'Things you do to keep rooms safe: reports you send, people you block. Reports are only seen by the Circles team.',
        "Saves, and thank-yous you give with the room they were for. A thank-you is never shown with your name, and we don't keep scores, streaks or rankings.",
        'Which rooms exist, their titles, and who opened each one, so we can put people into rooms.',
        'Technical records our providers keep to run the service, such as your internet address, times you connected, and the nickname and room you used for voice.',
        'If you share a room link, it carries your nickname, so your friend sees who invited them.',
      ],
    },
    {
      heading: 'What we never keep',
      paragraphs: [
        'Your voice. Rooms are live and are not recorded by us.',
        'Room chat. Messages are only passed between the people in the room while it is happening, and are gone when you leave.',
        'Games. Game moves are never stored. Find the Impostor words and votes are deleted when the game ends, or within a few hours if a game is left unfinished.',
      ],
    },
    {
      heading: 'Who helps us run Circles',
      paragraphs: [
        'Supabase keeps our accounts and database. LiveKit carries the live voice and room chat between the people in a room. Expo builds and delivers the app. They handle data only to run Circles for us.',
        'Your data may be stored on, or pass through, servers outside Nigeria.',
        'We do not sell your data, and there are no adverts in rooms.',
      ],
    },
    {
      heading: 'How long we keep it',
      paragraphs: [
        'Your account stays until you delete it. Deleting your account (Me, then Delete my account) deletes your nickname, date of birth, email, saves, blocks and thank-yous straight away.',
        'Reports are kept while they help us keep people safe, then deleted. A report you sent stays after you delete your account, without your account linked, so we can still act on it. A report about you keeps the nickname you had.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You can ask what we hold about you, ask us to correct it, or delete it. Nigerian data protection law gives you these rights.',
        contactLine,
      ],
    },
    {
      heading: 'Age',
      paragraphs: ['Circles is for people 18 and over. If we learn someone is under 18, we close their account.'],
    },
    {
      heading: 'Changes',
      paragraphs: ['If we change this page in a way that matters, we will tell you in the app first.'],
    },
  ],
};

export const TERMS: LegalDoc = {
  title: 'Terms',
  intro:
    'These are the rules for using Circles. By using Circles you agree to them. Circles is a test version right now, so things will change and sometimes break.',
  sections: [
    {
      heading: 'Who can use Circles',
      paragraphs: ['You must be 18 or over. Use the date of birth that is really yours.'],
    },
    {
      heading: 'Be kind',
      paragraphs: [
        'Everyone in a room is a real person. Listen, take turns, and leave room for others.',
        'Use your nickname only. Never share anyone’s real name, phone number, address or location, including your own if you are not sure.',
        'No sexual talk or requests, no hate or harassment, no threats or violence, no scams, spam or selling, and nothing illegal.',
      ],
    },
    {
      heading: 'Keeping rooms safe',
      paragraphs: [
        'Tap anyone to block or report them. They are never told who did it.',
        'We may remove someone from a room, pause their account, or close it if they break these rules. Serious cases may be passed to the police.',
      ],
    },
    {
      heading: 'Support rooms are not a crisis or medical service',
      paragraphs: [
        '"Need someone to talk to" rooms are kind people listening, with a trained host. They are not therapy, medical care or an emergency service.',
        'If you or someone else is in danger right now, contact your local emergency services or go to the nearest hospital.',
      ],
    },
    {
      heading: 'What you say',
      paragraphs: [
        'You are responsible for what you say in rooms and chat. Rooms are not recorded, so please report anything wrong when it happens.',
      ],
    },
    {
      heading: 'The test version',
      paragraphs: [
        'Circles is free during the test. Features may change, stop or be removed. We may ask for an email or phone number to keep using Circles later, and we will tell you before we do.',
        'We do our best to keep Circles running and safe, but we cannot promise it will always work. As far as the law allows, we are not responsible for losses from using it.',
      ],
    },
    {
      heading: 'The law',
      paragraphs: ['These terms are governed by the laws of Nigeria.'],
    },
  ],
};
