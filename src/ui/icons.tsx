import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from './theme';

export type IconName =
  | 'home' | 'play' | 'food' | 'wallet' | 'squad' | 'bell' | 'monitor' | 'scan' | 'swap' | 'trophy'
  | 'chevron' | 'back' | 'clock' | 'lock' | 'user' | 'key' | 'plus' | 'send' | 'chat' | 'bag'
  | 'flash' | 'check' | 'globe' | 'close' | 'pin' | 'fire' | 'leaf' | 'smoke' | 'logout' | 'crown' | 'gamepad' | 'minus';

const S = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function Icon({ name, size = 20, color = colors.text, stroke = 1.9 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  const p = { ...S, stroke: color, strokeWidth: stroke };
  const body = (() => {
    switch (name) {
      case 'home': return <Path {...p} d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />;
      case 'play':
      case 'gamepad': return <><Rect {...p} x={2} y={6} width={20} height={12} rx={6} /><Path {...p} d="M7 10v4M5 12h4" /><Circle {...p} cx={16} cy={11} r={0.8} /><Circle {...p} cx={18} cy={13} r={0.8} /></>;
      case 'food': return <Path {...p} d="M4 3v8a3 3 0 0 0 3 3v7M7 3v6M10 3v8a3 3 0 0 1-3 3M17 21V3c-2 0-4 3-4 7s2 5 4 5" />;
      case 'wallet': return <><Rect {...p} x={3} y={6} width={18} height={14} rx={3} /><Path {...p} d="M3 10h18M16 15h2M6 6V5a2 2 0 0 1 2-2h9" /></>;
      case 'squad': return <><Circle {...p} cx={9} cy={8} r={3.5} /><Path {...p} d="M2.5 20a6.5 6.5 0 0 1 13 0" /><Circle {...p} cx={17} cy={9} r={2.5} /><Path {...p} d="M16 14.5a5 5 0 0 1 5.5 5" /></>;
      case 'bell': return <Path {...p} d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" />;
      case 'monitor': return <><Rect {...p} x={2} y={4} width={20} height={13} rx={2} /><Path {...p} d="M8 21h8M12 17v4" /></>;
      case 'scan': return <Path {...p} d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" />;
      case 'swap': return <Path {...p} d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />;
      case 'trophy': return <Path {...p} d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4" />;
      case 'chevron': return <Path {...p} d="m9 6 6 6-6 6" />;
      case 'back': return <Path {...p} d="m15 6-6 6 6 6" />;
      case 'clock': return <><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M12 7v5l3 2" /></>;
      case 'lock': return <><Rect {...p} x={4} y={11} width={16} height={10} rx={2} /><Path {...p} d="M8 11V7a4 4 0 0 1 8 0v4" /></>;
      case 'user': return <><Circle {...p} cx={12} cy={8} r={4} /><Path {...p} d="M4 21a8 8 0 0 1 16 0" /></>;
      case 'key': return <><Circle {...p} cx={8} cy={15} r={4} /><Path {...p} d="m11 12 9-9M17 6l3 3M15 8l2 2" /></>;
      case 'plus': return <Path {...p} d="M12 5v14M5 12h14" />;
      case 'minus': return <Path {...p} d="M5 12h14" />;
      case 'send': return <Path {...p} d="m4 12 16-8-6 16-3-7z" />;
      case 'chat': return <Path {...p} d="M4 5h16v11H9l-5 4z" />;
      case 'bag': return <Path {...p} d="M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2" />;
      case 'flash': return <Path {...p} d="M13 2 4 14h7l-1 8 9-12h-7z" />;
      case 'check': return <Path {...p} d="m5 12 5 5 9-10" />;
      case 'globe': return <><Circle {...p} cx={12} cy={12} r={9} /><Path {...p} d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>;
      case 'close': return <Path {...p} d="M6 6l12 12M18 6 6 18" />;
      case 'pin': return <><Path {...p} d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><Circle {...p} cx={12} cy={9.5} r={2.5} /></>;
      case 'fire': return <Path {...p} d="M12 21c4 0 7-2.7 7-6.5 0-4.5-4-6.5-4-10.5-3 1.5-5 4.5-5 7-1-1-1.5-2-1.5-3C6 9.5 5 12 5 14.5 5 18.3 8 21 12 21z" />;
      case 'leaf': return <Path {...p} d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7" />;
      case 'smoke': return <Path {...p} d="M3 16h14v4H3zM19 16v4M21 16v4M17 12c0-2 2-2 2-4s-2-2-2-4" />;
      case 'logout': return <Path {...p} d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />;
      case 'crown': return <Path {...p} d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" />;
    }
  })();
  return <Svg width={size} height={size} viewBox="0 0 24 24">{body}</Svg>;
}
