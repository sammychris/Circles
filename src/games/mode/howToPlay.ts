import { AGREE_SECONDS } from '../chess/engine';
import { DAY_SECONDS } from '../mafia/engine';
import { SPEAK_SECONDS, ROUNDS_PER_GAME } from '../impostor/logic';
import { TURN_SECONDS } from '../whot/engine';

export type GameKind = 'ludo' | 'draughts' | 'chess' | 'whot' | 'mafia' | 'impostor';

export const GAME_TITLE: Record<GameKind, string> = {
  ludo: 'Ludo',
  draughts: 'Draughts',
  chess: 'Chess in teams',
  whot: 'Whot',
  mafia: 'Mafia',
  impostor: 'Find the Impostor',
};

// "How to play" in the ⋯ menu: the rules in 3 to 6 short lines, so new people feel at home
// (game-mode.md › The ⋯ menu).
export const HOW_TO_PLAY: Record<GameKind, string[]> = {
  ludo: [
    'Two teams, Sun and Sky. Anyone on your team can roll and move.',
    'Roll a 6 to bring a token out of base.',
    'Move a token by the number on the dice. A 6 gives you another roll.',
    "Land on the other team's token to send it back to base. Start squares and stars are safe.",
    'Get all four tokens home to win.',
  ],
  draughts: [
    'Two teams. Talk it over, then anyone on your team moves.',
    'Pieces move one square diagonally forward.',
    "Jump over the other team's piece to take it. If you can take, you must, and keep jumping if you can.",
    'Reach the far side to get a king, which moves forwards and backwards.',
    'Take all their pieces, or leave them with no move, to win.',
  ],
  chess: [
    'Two teams play one game of chess.',
    'Anyone on your team taps a piece and a square to suggest a move.',
    `Teammates tap Agree. The move is played when enough of the team agrees, or after ${AGREE_SECONDS} seconds.`,
    'A new suggestion takes the place of the old one.',
    'Checkmate wins.',
  ],
  whot: [
    'Play a card with the same shape or number as the card on the pile.',
    'No card to play? Go to market and pick one.',
    '1 Hold on, 2 Pick two, 5 Pick three, 8 Suspension, 14 General market.',
    'Whot 20 goes on anything, and you choose the shape the next person needs.',
    `First to play all their cards wins. You have ${TURN_SECONDS} seconds each go.`,
  ],
  mafia: [
    'A narrator reads out what happens. Everyone else gets a secret role.',
    'At night, mics pause. The Mafia picks someone to take out, the Doctor saves someone, and the Detective checks someone.',
    `By day, talk it over and vote. You have ${Math.round((DAY_SECONDS / 60) * 2) / 2} minutes.`,
    'Being out only means out of the game. You stay in the room and can still talk.',
    'The town wins when the Mafia are all out. The Mafia win when there are as many of them as everyone else.',
  ],
  impostor: [
    'Everyone gets the same secret word, except one person: the impostor.',
    `Take turns describing the word, about ${SPEAK_SECONDS} seconds each, without saying it.`,
    "Then vote on who's faking it.",
    'Votes only count for the game. Nobody leaves the room.',
    `${ROUNDS_PER_GAME} rounds make a game.`,
  ],
};
