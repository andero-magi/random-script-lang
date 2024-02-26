
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
    // '   5 : 3   '
    // '  12 : 0   '
    return `${this.line.toString().padStart(4)} : ${this.col.toString().padEnd(4)}`
  }
}

export enum TokenType {
  EOF,
  ERR,
  ID,
  NUM,
  LPAREN,
  RPAREN,
  MUL,
  POW,
  DIV,
  ADD,
  SUB,
  ABS_WALL,
  COMMA,
}

type TokenValue = string | number | null

export class Token {
  readonly loc: FileLocation
  readonly type: TokenType
  readonly value: TokenValue

  constructor(type: TokenType, loc: FileLocation, value: TokenValue = null) {
    this.type = type
    this.loc = loc
    this.value = value;
  }
}