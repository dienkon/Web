import { useMemo } from 'react';
import { useMeetingStore } from '../store/meetingStore';
import { Participant } from '../types/meeting';

export function useParticipants() {
  const { participants, activeSpeakerId, pinnedParticipantId, isHost } = useMeetingStore();

  const participantsList = useMemo(() => {
    return Array.from(participants.values());
  }, [participants]);

  const hostParticipant = useMemo(() => {
    return participantsList.find((p) => p.isHost);
  }, [participantsList]);

  const activeSpeaker = useMemo(() => {
    if (!activeSpeakerId) return null;
    return participants.get(activeSpeakerId) || null;
  }, [activeSpeakerId, participants]);

  const pinnedParticipant = useMemo(() => {
    if (!pinnedParticipantId) return null;
    return participants.get(pinnedParticipantId) || null;
  }, [pinnedParticipantId, participants]);

  return {
    participantsList,
    totalCount: participantsList.length,
    hostParticipant,
    activeSpeaker,
    pinnedParticipant,
    isHost,
  };
}
