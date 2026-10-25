// Vocaux ephemeres et prives d'une partie Monopoly, sans toucher au chat d'accueil.
import { walletRequest } from './accounts';
const base='/api/monopoly/voices';
export async function listMatchVoices(roomId) {
  const data=await walletRequest(`${base}/${roomId}`);
  return data.voices||[];
}
export const sendMatchVoice=(roomId,voice)=>walletRequest(`${base}/${roomId}`,{method:'POST',body:voice});
export const fetchMatchVoice=(roomId,voiceId)=>walletRequest(`${base}/${roomId}/${voiceId}/audio`,{responseType:'blob'});
