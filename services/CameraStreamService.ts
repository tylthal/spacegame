class CameraStreamService {
  private static activeStream: MediaStream | null = null;
  private static probeStream: MediaStream | null = null;

  private static stopStream(stream: MediaStream | null) {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
  }

  static useActiveStream(stream: MediaStream) {
    if (this.activeStream && this.activeStream !== stream) {
      this.stopStream(this.activeStream);
    }
    this.activeStream = stream;
  }

  static useProbeStream(stream: MediaStream) {
    if (this.probeStream && this.probeStream !== stream) {
      this.stopStream(this.probeStream);
    }
    this.probeStream = stream;
  }

  static getActiveStream() {
    return this.activeStream;
  }

  static getProbeStream() {
    return this.probeStream;
  }

  static stopActiveStream() {
    if (this.activeStream) {
      const stream = this.activeStream;
      this.stopStream(stream);
      if (this.probeStream === stream) this.probeStream = null;
      this.activeStream = null;
    }
  }

  static stopProbeStream() {
    if (this.probeStream) {
      const stream = this.probeStream;
      this.stopStream(stream);
      if (this.activeStream === stream) this.activeStream = null;
      this.probeStream = null;
    }
  }

  static stopAll() {
    this.stopActiveStream();
    this.stopProbeStream();
  }
}

export { CameraStreamService };
