import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// The phone's Reduce motion setting: when it's on, movement becomes a quick fade.
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}
