// Short alarm: looping beep + vibration for `seconds`, then stops. Plays even in iOS silent mode.
import { Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

let modeSet = false;

export async function playAlarm(seconds = 5) {
  Vibration.vibrate([0, 600, 300, 600, 300, 600, 300, 600], false);
  try {
    if (!modeSet) { modeSet = true; await setAudioModeAsync({ playsInSilentMode: true }); }
    const player = createAudioPlayer(require('../../assets/alarm.wav'));
    player.loop = true;
    player.volume = 1;
    player.play();
    setTimeout(() => { try { player.pause(); player.remove(); } catch { /* gone */ } Vibration.cancel(); }, seconds * 1000);
  } catch { /* audio unavailable: vibration only */ }
}
