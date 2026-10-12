import { Pressable, View } from 'react-native';
import { BadgeCheck, Shield } from 'lucide-react-native';
import { BADGE, hostName, priceWords, type HostCard } from '../../support/api';
import { size, space, useColors } from '../../theme';
import { Button } from '../Button';
import { Chip } from '../Chip';
import { Sheet } from '../Sheet';
import { Text } from '../Text';

// A host's card (support-section-spec.md › Host profile card): who they are, what they help with, the
// price before anything else, and Request one-on-one when they offer it and are online.
export function HostCardSheet({
  card,
  onClose,
  onRequest,
  onReport,
}: {
  card: HostCard | null;
  onClose: () => void;
  // Missing when you can't ask from here (it's you, or they're not offering it right now).
  onRequest?: (card: HostCard) => void;
  onReport?: (card: HostCard) => void;
}) {
  const colors = useColors();
  const pro = card?.kind === 'professional';
  const Icon = pro ? BadgeCheck : Shield;
  return (
    <Sheet visible={!!card} onClose={onClose}>
      {card ? (
        <>
          <View style={{ gap: space[2] }}>
            <Text variant="title" accessibilityRole="header">
              {hostName(card)}
            </Text>
            <Chip Icon={Icon} label={BADGE[card.kind]} fg={pro ? colors.live : colors.emberText} bg={pro ? colors.liveSoft : colors.emberSoft} />
            {pro && card.credential ? (
              <Text variant="meta" color="textSoft">{`${card.credential} · ${card.issuingBody ?? ''}`}</Text>
            ) : null}
            {!pro ? (
              <Text variant="meta" color="textSoft">
                Peer support, not a therapist.
              </Text>
            ) : null}
          </View>
          {card.intro ? <Text variant="body">{card.intro}</Text> : null}
          <View style={{ gap: space[1] }}>
            {card.topics.length > 0 ? <Text variant="meta" color="textSoft">{`Helps with: ${card.topics.join(', ')}`}</Text> : null}
            {card.languages.length > 0 ? <Text variant="meta" color="textSoft">{`Speaks: ${card.languages.join(', ')}`}</Text> : null}
            {card.rating !== null ? <Text variant="meta" color="textSoft">{`Rated ${card.rating} of 5 · ${card.sessions} sessions`}</Text> : null}
          </View>
          {card.oneOnOne ? (
            <View style={{ gap: space[2] }}>
              <Text variant="bodyStrong">{`One-on-one: ${priceWords(card)}`}</Text>
              <Text variant="meta" color="textMeta">
                {card.online ? 'Online now' : 'Not online right now'}
              </Text>
              {onRequest && card.online ? <Button label="Request one-on-one" variant="primary" onPress={() => onRequest(card)} /> : null}
            </View>
          ) : null}
          {onReport ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onReport(card)}
              style={{ minHeight: size.minTarget, justifyContent: 'center', alignSelf: 'flex-start' }}
            >
              <Text variant="metaStrong" color="textSoft" style={{ textDecorationLine: 'underline' }}>
                Report
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

// Before asking: the length, the price (or Free), and what the host will see. Paid sessions wait for
// payments in the app, which aren't connected yet.
export function RequestSheet({
  card,
  busy,
  onClose,
  onConfirm,
}: {
  card: HostCard | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (card: HostCard) => void;
}) {
  const paid = !!card && card.priceNaira > 0 && !card.freeFirst;
  return (
    <Sheet visible={!!card} onClose={onClose}>
      {card ? (
        <>
          <Text variant="title" accessibilityRole="header">
            {`One-on-one with ${hostName(card)}`}
          </Text>
          <View style={{ gap: space[2] }}>
            <Text variant="body">{`${BADGE[card.kind]} · ${priceWords(card)}`}</Text>
            <Text variant="meta" color="textSoft">
              {`${hostName(card)} sees only your nickname. They have 10 minutes to say yes, and the time starts then. A session is never stopped to ask for money.`}
            </Text>
            {paid ? (
              <Text variant="meta" color="textSoft">
                Paying in the app is coming soon, so paid sessions can't be booked yet.
              </Text>
            ) : null}
          </View>
          <View style={{ gap: space[3] }}>
            <Button label="Ask for a session" variant="primary" disabled={paid} loading={busy} onPress={() => onConfirm(card)} />
            <Button label="Not now" variant="quiet" onPress={onClose} />
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
