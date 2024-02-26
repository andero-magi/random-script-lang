
export class FileLocation {
  readonly line: number
  readonly col: number
  readonly cursor: number

  constructor(line: number, col: number, cursor: number) {
    this.line = line
    this.col = col
    this.cursor = cursor
  }

  toString(): string {
    return `${this.line.toString().padStart(5)}:${this.col.toString().padStart(5)}`
  }
}

