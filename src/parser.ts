import { FileLocation } from "./tokens"

type char = number | string

const EOF: char = -1
const LF: char = "\n"
const CR: char = "\r"

function formatError(message: string, location: FileLocation, input: string) {

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
  private source: string
  private currentChar: null | char

  private line: number
  private col: number
  private cursor: number

  constructor(source: string) {
    this.source = source
    this.currentChar = null 

    this.line = 1
    this.col = 0
    this.cursor = -1
  }

  get location(): FileLocation {
    return new FileLocation(this.line, this.col, this.cursor)
  }
}

class Parser {
  private tokens: TokenStream

  constructor(stream: TokenStream) {
    this.tokens = stream
  }
}