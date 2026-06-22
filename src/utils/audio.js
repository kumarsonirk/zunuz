// Web Audio API Synthesizer for high-fidelity clicks, mechanical shutter, focal clank, and sweep
class AudioPlayer {
  constructor() {
    this.ctx = null;
    this.muted = true;
  }
  init() {}
  playTick() {}
  playCameraShutter(scale = 1) {}
  playFinalClank() {}
  playSplitOpen() {}
  playConfirm() {}
}

const zr = new AudioPlayer();
export default zr;
export { AudioPlayer };
