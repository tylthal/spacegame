class CameraStreamService {
  private static activeStream: MediaStream | null = null;

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

  static getActiveStream() {
    return this.activeStream;
  }

  static stopActiveStream() {
    if (this.activeStream) {
      const stream = this.activeStream;
      this.stopStream(stream);
      this.activeStream = null;
    }
  }

  static stopAll() {
    this.stopActiveStream();
  }
}

export { CameraStreamService };
