import { useEffect, useState } from 'react';
import { Linking, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe } from 'lucide-react-native';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { ErrorLine } from '../components/ErrorLine';
import { RoomCircle } from '../components/RoomCircle';
import { Text } from '../components/Text';
import { seatsOpenText } from '../lib/seats';
import { previewRoom, type RoomPreview } from '../rooms/api';
import { space, useColors } from '../theme';

const LINE: Record<string, string> = {
  play: 'Play and talk with a few people',
  talk: 'Talk with a few people, by voice',
};

type Props = {
  roomId: string;
  by?: string;
  starting: boolean;
  error: string | null;
  // Makes the account (18+ question and nickname come next), then the room opens by itself.
  onJoin: () => void;
  // The room has ended: start the usual way, then find another room.
  onFindAnother: () => void;
  // Already-loaded preview (for screenshots and tests); otherwise it's fetched.
  initialPreview?: RoomPreview;
};

// Someone tapped a friend's room link (docs/screens/16-join-from-a-link.png, link-first.md).
export function LinkPreviewScreen({ roomId, by, starting, error, onJoin, onFindAnother, initialPreview }: Props) {
  const colors = useColors();
  const [preview, setPreview] = useState<RoomPreview | null>(initialPreview ?? null);
  const [failed, setFailed] = useState(false);
  const web = Platform.OS === 'web';

  useEffect(() => {
    if (initialPreview) return;
    void previewRoom(roomId)
      .then(setPreview)
      .catch(() => setFailed(true));
  }, [roomId, initialPreview]);

  const open = preview?.status === 'open' ? preview : null;
  const ended = preview?.status === 'ended';
  const here = open?.here ?? 0;
  const capacity = open?.room.capacity ?? 6;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter, paddingTop: space[5], paddingBottom: space[5], gap: space[5], alignItems: 'center' }}>
        <Text variant="heading" color="ember">
          Circles
        </Text>
        {web ? (
          <View style={{ alignItems: 'center' }}>
            <Chip Icon={Globe} label="In your browser" fg={colors.textSoft} bg={colors.raised} />
          </View>
        ) : null}

        {open ? (
          <View style={{ gap: space[2], alignItems: 'center' }}>
            {by ? (
              <Text variant="body" color="textSoft" center>
                {`${by} invited you to`}
              </Text>
            ) : null}
            <Text variant="display" center accessibilityRole="header">
              {open.room.title}
            </Text>
            <Text variant="body" color="textSoft" center>
              {LINE[open.room.door] ?? LINE.talk}
            </Text>
          </View>
        ) : ended ? (
          <View style={{ gap: space[2], alignItems: 'center' }}>
            <Text variant="display" center accessibilityRole="header">
              This room has ended
            </Text>
            <Text variant="body" color="textSoft" center>
              Rooms close when people leave. There are other rooms open now.
            </Text>
          </View>
        ) : failed ? (
          <Text variant="body" color="textSoft" center>
            We couldn't open this link. Check that you're online, then reload the page.
          </Text>
        ) : (
          <Text variant="body" color="textSoft" center>
            Opening the room…
          </Text>
        )}

        {open ? (
          // Only how many are there, never who: they haven't met you yet.
          <RoomCircle
            people={[]}
            capacity={capacity}
            anonymousTaken={Math.min(here, capacity)}
            centre={
              <View style={{ alignItems: 'center' }}>
                <Text variant="heading" center>{`${here} here`}</Text>
                <Text variant="meta" color="textMeta" center>
                  {seatsOpenText(here, capacity)}
                </Text>
              </View>
            }
          />
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: space.gutter, paddingBottom: space[4], gap: space[3] }}>
        {error ? <ErrorLine message={error} /> : null}
        {ended || failed ? (
          <Button label="Find a room" variant="primary" loading={starting} onPress={onFindAnother} />
        ) : (
          <>
            <Button
              label={web ? 'Join in your browser' : 'Join the room'}
              variant="primary"
              loading={starting}
              disabled={!open}
              onPress={onJoin}
            />
            <Text variant="meta" color="textMeta" center>
              {web
                ? 'No download. Answer one question, then pick a nickname. 18+ only.'
                : 'Answer one question, then pick a nickname. 18+ only.'}
            </Text>
          </>
        )}
        {web && open ? (
          <Button
            label="Open in the Circles app"
            variant="quiet"
            onPress={() => void Linking.openURL(`circles://r/${roomId}`).catch(() => {})}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
