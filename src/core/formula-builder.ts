import type { GeneratedFormula, PlaceholderRange } from "./types";

export class FormulaBuilder {
  private readonly chunks: string[] = [];
  private readonly ranges: PlaceholderRange[] = [];
  private length = 0;

  append(text: string): this {
    this.chunks.push(text);
    this.length += text.length;
    return this;
  }

  parameter(id: string, value: string, placeholderIds: ReadonlySet<string>): this {
    const from = this.length;
    this.append(value);
    if (placeholderIds.has(id)) {
      this.ranges.push({ id, from, to: this.length });
    }
    return this;
  }

  build(): GeneratedFormula {
    return {
      latex: this.chunks.join(""),
      placeholders: this.ranges,
      cursorEnd: this.length,
    };
  }
}
