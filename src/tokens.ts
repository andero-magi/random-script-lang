
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
  EOF,      // End-Of-File
  ERR,      // Unrecognized token
  ID,       // [a-zA-Z_$][a-zA-Z0-9_$]*
  NUM,      // [0-9]+(.[0-9]+)?(e[+-]?[0-9]+)?
  LPAREN,   // (
  RPAREN,   // )
  MUL,      // *
  POW,      // *
  DIV,      // /
  FLOORDIV, // //
  ADD,      // + 
  SUB,      // -
  ABS_WALL, // |
  COMMA,    // ,
}

function ttToString(type: TokenType): string {
  switch(type) {
    case TokenType.EOF:       return "<EOF>"
    case TokenType.ERR:       return "UNKNOWN_TOKEN"
    case TokenType.ID:        return "IDENTIFIER"
    case TokenType.NUM:       return "NUMBER"
    case TokenType.LPAREN:    return "LEFT_PAREN:'('"
    case TokenType.RPAREN:    return "RIGHT_PAREN:')'"
    case TokenType.MUL:       return "MUL:'*'"
    case TokenType.POW:       return "POW:'**'"
    case TokenType.DIV:       return "DIV:'/'"
    case TokenType.FLOORDIV:  return "FLOORDIV:'//'"
    case TokenType.ADD:       return "ADD:'+'"
    case TokenType.SUB:       return "SUB:'-'"
    case TokenType.ABS_WALL:  return "ABS_WALL:'|'"
    case TokenType.COMMA:     return "COMMA:','"

    default:
      return "Unknown token type"
  }
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