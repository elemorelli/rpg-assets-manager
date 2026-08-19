let claimingAudioElement: HTMLAudioElement | null = null;

export const claimExclusivePlayback = (audio: HTMLAudioElement): void => {
  if (claimingAudioElement !== null && claimingAudioElement !== audio) {
    claimingAudioElement.pause();
  }

  claimingAudioElement = audio;
};
