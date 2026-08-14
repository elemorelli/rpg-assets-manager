export class FakeEventSource {
  static instances: FakeEventSource[] = [];

  readonly url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  close(): void {
    this.closed = true;
  }

  emitMessage(data: string): void {
    this.onmessage?.({ data } as MessageEvent);
  }

  static reset(): void {
    FakeEventSource.instances = [];
  }
}
