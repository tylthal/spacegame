export type DisposableLike = { dispose: () => void } | (() => void);

export class ResourceLifecycle {
  private disposers: Array<() => void> = [];

  add(disposable?: DisposableLike | null) {
    if (!disposable) return;
    if (typeof disposable === 'function') {
      this.disposers.push(disposable);
    } else if (typeof disposable.dispose === 'function') {
      this.disposers.push(() => disposable.dispose());
    }
  }

  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }

  addAnimationFrame(callback: FrameRequestCallback) {
    const rafId = requestAnimationFrame(callback);
    this.add(() => cancelAnimationFrame(rafId));
    return rafId;
  }

  disposeAll() {
    while (this.disposers.length) {
      const disposer = this.disposers.pop();
      try {
        disposer?.();
      } catch (error) {
        console.warn('ResourceLifecycle dispose failed', error);
      }
    }
  }
}
