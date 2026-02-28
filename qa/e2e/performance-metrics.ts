export class PerformanceTracker {
  private readonly marks = new Map<string, number>();

  mark(key: string): void {
    this.marks.set(key, Date.now());
  }

  measureMs(startKey: string, endKey: string): number {
    const start = this.marks.get(startKey);
    const end = this.marks.get(endKey);
    if (start == null || end == null) {
      throw new Error(`Missing performance marks: ${startKey} or ${endKey}`);
    }
    return Math.max(0, end - start);
  }
}
