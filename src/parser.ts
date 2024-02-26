import { FileLocation } from "./tokens"

type char = number | string

const EOF: char = -1
const LF: char = "\n"
const CR: char = "\r"

function formatError(message: string, location: FileLocation, input: string): string {

  function findLineLimit(input: string, index: number, dir: number) {
    while(index >= 0 && index <= input.length) {
      let ch = input[index]
      index += dir

      if (ch == CR || ch == LF) {
        return dir == -1 ? index + 1 : index
      }
    }

    return dir == -1 ? 0 : input.length
  }

  if (location == null || input == null) {
    return message;
  }
  
  let lineStart = findLineLimit(input, location.cursor, -1)
  let lineEnd = findLineLimit(input, location.cursor, 1)

  let lineStr = input.substring(lineStart, lineEnd)
  let col = location.col;

  let context = `^ On line ${location.line}, column ${col}`;

  return `[ERROR] ${message}:\n${lineStr}\n${context.padStart(col - 1 + context.length)}\n`;
}

class TokenStream {
  private input: string
  private currentChar: null | char

  private line: number
  private col: number
  private cursor: number

  constructor(source: string) {
    this.input = source
    this.currentChar = null 

    this.line = 1
    this.col = 0
    this.cursor = -1
  }

  get location(): FileLocation {
    return new FileLocation(this.line, this.col, this.cursor)
  }

  error(message: string, loc: FileLocation) {
    throw formatError(message, loc, this.input)
  }

  advance(): void {
    let nC = this.cursor + 1
    let ch = this.getChar(nC)

    if (ch == EOF) {
      this.cursor = this.input.length
      this.currentChar = EOF

      return
    }

    if (ch == CR || ch == LF) {
      this.line++
      this.col = 0
    } else {
      this.col++
    }

    this.currentChar = ch
    this.cursor = nC
  }

  getChar(index: number): char {
    if (index >= this.input.length) {
      return EOF;
    }
    return this.input[index];
  }
}

class Parser {
  private tokens: TokenStream

  constructor(stream: TokenStream) {
    this.tokens = stream
  }
}