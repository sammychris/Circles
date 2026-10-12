import { useState, type ReactNode } from 'react';
import { Button } from './Button';

// Lists that can grow (open rooms, groups, reminders…) show the first few, then See all, and Show fewer
// to shrink back, so a long list never pushes the rest of the page far down (Sammy, 2026-10-11).
export const SHOW_FIRST = 3;

export function ShowSome<T>({
  items,
  render,
  noun,
  first = SHOW_FIRST,
}: {
  items: T[];
  // Each item's row, with its own key.
  render: (item: T) => ReactNode;
  // For the button: "See all 8 open rooms".
  noun: string;
  first?: number;
}) {
  const [all, setAll] = useState(false);
  return (
    <>
      {(all ? items : items.slice(0, first)).map(render)}
      {items.length > first ? (
        <Button label={all ? 'Show fewer' : `See all ${items.length} ${noun}`} variant="quiet" onPress={() => setAll(!all)} />
      ) : null}
    </>
  );
}
