const EOF = -1
const COMMENT_CHAR = "#"
const LF = '\n'
const CR = '\r'

// Token Types
const TT_EOF      = EOF
const TT_ERR      = 0
const TT_ID       = 1
const TT_NUM      = 2
const TT_LPAREN   = 3 // (
const TT_RPAREN   = 4 // )
const TT_MUL      = 5 // *
const TT_POW      = 6 // **
const TT_DIV      = 7 // /
const TT_ADD      = 9 // +
const TT_SUB      = 11 // -
const TT_ABSW     = 12 // |
const TT_COMMA    = 13 // ,

// IR node types
const IR_ERR      = TT_ERR
const IR_ID       = TT_ID
const IR_NUM      = TT_NUM
const IR_CALL     = 3
const IR_UNARY    = 4
const IR_BINARY   = 6

// Binary operations
const BINARY_ADD  = 0
const BINARY_SUB  = 1
const BINARY_DIV  = 2
const BINARY_MUL  = 3
const BINARY_POW  = 4

// Unary operations
const UNARY_POS   = 0
const UNARY_NEG   = 1
const UNARY_ABS   = 2

const SCOPE_PROXY = createScopeProxy()

const { dir } = require("console")
const fs = require("fs");

main()

function ttToString(tt) {
  switch (tt) {
    case TT_EOF: return "TT_EOF"
    case TT_ERR: return "TT_ERR"
    case TT_ID: return "TT_ID"
    case TT_NUM: return "TT_NUM"
    case TT_LPAREN: return "TT_LPAREN"
    case TT_RPAREN: return "TT_RPAREN"
    case TT_MUL: return "TT_MUL"
    case TT_POW: return "TT_POW"
    case TT_DIV: return "TT_DIV"
    case TT_ADD: return "TT_ADD"
    case TT_SUB: return "TT_SUB"
    case TT_ABSW: return "TT_ABSW"
    default: return "UNKNOWN"
  }
}

function main() {
  let args = process.argv;

  if (args.length  < 3) {
    console.error("File name not given!");
    return
  }

  fs.readFile(args[2], null, (err, data) => {
    if (err) {
      console.error(`Error reading file: ${err}`)
      return;
    }

    evalString(data.toString());
  });
}

function evalString(str) {
  let stream = new TokenStream(str)

  const maxLoc = 7
  const maxVal = 30
  const maxType = 10

  while (true) {
    let token = stream.next()

    if (token.type == TT_EOF) {
      break
    }

    let ttName = ttToString(token.type)
    let val = token.value == undefined ? "" : token.value
    let loc = token.loc.toString()

    console.log(
      `| ${loc.padStart(maxLoc)} | ${val.padStart(maxVal)} | ${ttName.padStart(maxType)}`
    )
  }
}

function executeNodes(node, scope) {
  switch(node.type) {
    case IR_NUM:
      return node.value

    case IR_ID:
      let value = scope[node.value]

      if (value == null) {
        throw `Unknown value: '${node.value}'`
      }

      return value

    case IR_CALL:
      let funcObject = executeNodes(node.target, scope)
      let args = []

      for (let i = 0; i < node.args.length; i++) {
        const element = node.args[i];
        args[i] = executeNodes(element, scope)
      }

      return funcObject.apply(null, args)

    case IR_BINARY:
      let lhs = executeNodes(node.lhs, scope)
      let rhs = executeNodes(node.rhs, scope)

      
  }
}

function formatError(message, location, input) {

  function findLineLimit(input, index, dir) {
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


function paddedNum(num) {
  return num.toString().padStart(3)
}

// ----------------------------------------------------------------------
// --------------------------- CLASSES ----------------------------------
// ----------------------------------------------------------------------

class FileLocation {
  constructor(cursor, line, col) {
    this.cursor = cursor;
    this.line = line;
    this.col = col;
  }

  toString() {
    return paddedNum(this.line) + ":" + paddedNum(this.col)
  }
}

class TokenStream {

  constructor(inputStr) {
    this.input = inputStr

    this.cursor = -1
    this.line = 0
    this.col = 0

    this.currentChar = null;

    this.peekedToken = null;
  }

  error(message, loc) {
    throw formatError(message, loc, this.input)
  }

  get location() {
    return new FileLocation(this.cursor, this.line, this.col)
  }

  advance() {
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

  getChar(index) {
    if (index >= this.input.length) {
      return EOF;
    }
    return this.input[index];
  }

  next() {
    if (this.peekedToken != null) {
      let t = this.peekedToken
      this.peekedToken = null
      return t
    }

    return this.parseToken()
  }

  peek() {
    if (this.peekedToken != null) {
      return this.peekedToken
    }

    let t = this.parseToken()
    this.peekedToken = t;

    return t;
  }

  skipWhitespace() {
    while (true) {
      let ch = this.currentChar

      if (ch == EOF) {
        return
      }

      if (this.isWhitespace(ch)) {
        this.advance()
        continue
      }

      if (ch == COMMENT_CHAR) {
        skipUntilLineEnd()
        continue
      }

      return
    }
  }

  skipUntilLineEnd() {
    while (true) {
      let ch = this.currentChar;

      if (ch == LF || ch == EOF || ch == CR) {
        return
      }

      this.advance()
    }
  }

  isWhitespace(ch) {
    return ch == ' ' || ch == '\n' || ch == '\r';
  }

  parseToken() {
    if (this.currentChar == null) {
      this.advance()
    }

    this.skipWhitespace()

    const loc = this.location;

    if (this.currentChar == EOF) {
      return { loc: loc, type: TT_EOF }
    }

    if (this.isNumber(this.currentChar)) {
      let num = this.parseNumberValue()
      return {type: TT_NUM, value: num, loc: loc}
    }

    switch (this.currentChar) {
      case "(": return this.singleCharToken(TT_LPAREN)
      case ")": return this.singleCharToken(TT_RPAREN)
      case "|": return this.singleCharToken(TT_ABSW)
      case "+": return this.singleCharToken(TT_ADD)
      case "-": return this.singleCharToken(TT_SUB)
      case "/": return this.singleCharToken(TT_DIV)
      case ",": return this.singleCharToken(TT_COMMA)

      case "*":
        this.advance()

        if (this.currentChar == '*') {
          this.advance()
          return {type: TT_POW, loc: loc}
        }

        return {type: TT_MUL, loc: loc}

      default:
        if (this.isIdStart(this.currentChar)) {
          let id = this.parseId()
          return {type: TT_ID, value: id, loc: loc}
        }

        let ch = this.currentChar
        this.advance()

        return {type: TT_ERR, value: ch, loc: loc}
    }
  }

  /**
   * 
   * @param {string} ch 
   * @returns 
   */
  isIdStart(ch) {
    return (ch >= 'a' && ch <= 'z')
        || (ch >= 'A' && ch <= 'Z')
        || ch == '_'
        || ch == '$'
  }

  isIdPart(ch) {
    return this.isIdStart(ch) || this.isNumber(ch)
  }

  parseId() {
    let result = ""
    
    while (true) {
      let ch = this.currentChar;

      if (!this.isIdPart(ch)) {
        break
      }

      result += ch
      this.advance()
    }

    return result
  }

  singleCharToken(ttype) {
    let l = this.location
    this.advance()
    return {type: ttype, loc: l}
  }

  isNumber(ch) {
    switch (ch) {
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
      case ".":
        return true

      default:
        return false
    }
  }

  parseNumberValue() {
    let result = ""

    let exponentSet = false
    let expLast = false;
    let decimalSet = false

    while (true) {
      let ch = this.currentChar

      if (ch == '+' || ch == '-') {
        if (!expLast) {
          break
        }

        result += ch
        this.advance()

        continue
      }

      if (ch == 'e' || ch == 'E') {
        if (exponentSet) {
          this.error("Exponent already set", this.location)
        }

        exponentSet = true
        expLast = true
        result += ch

        this.advance()

        continue
      }

      if (ch == '.') {
        if (exponentSet) {
          this.error("Exponent set, decimal cannot be used", this.location)
        }

        if (decimalSet) {
          this.error("Decimal already set", this.location)
        }

        decimalSet = true
        expLast = false
        result += "."

        this.advance()

        continue
      }

      if (!this.isNumber(ch)) {
        break
      }

      result += ch
      expLast = false

      this.advance()
    }

    if (expLast) {
      this.error("Number cannot end with exponent", this.location)
    }

    return Number(result)
  }
}

class Parser {

  constructor(stream) {
    this.stream = stream
  }

  error(message, loc) {
    this.stream.error(message, loc)
  }

  next() {
    return this.stream.next()
  }

  peek() {
    return this.stream.peek()
  }

  matches(type) {
    return this.peek().type == type
  }

  expect(type) {
    let tt = this.next()

    if (tt.type != type) {
      this.stream.error(`Expected ${ttToString(type)}, found ${ttToString(tt.type)}`)
    }

    return tt
  }

  parse() {
    return this.binaryExpr()
  }

  binaryExpr() {
    let lhs = this.unaryExpr()
    let peeked = this.peek()

    if (!this.isBinary(peeked.type)) {
      return lhs
    }

    this.next()

    let rhs = this.unaryExpr()

    let binaryOp;

    switch (peeked.type) {
      case TT_ADD:
        binaryOp = BINARY_ADD
        break
      case TT_MUL:
        binaryOp = BINARY_MUL
        break
      case TT_POW:
        binaryOp = BINARY_POW
        break
      case TT_DIV:
        binaryOp = BINARY_DIV
        break
      case TT_SUB:
        binaryOp = BINARY_SUB
        break
      
      default:
        this.error("idk lmao", peeked.loc)
    }

    return {
      type: IR_BINARY,
      operation: binaryOp,
      lhs: lhs,
      rhs: rhs,
      loc: lhs.loc
    }
  }

  isBinary(ttype) {
    switch (ttype) {
      case TT_ADD:
      case TT_MUL:
      case TT_POW:
      case TT_DIV:
      case TT_SUB:
        return true

      default:
        return false
    }
  }

  unaryExpr() {
    if (!this.isUnary(this.peek().type)) {
      return this.callExpr()
    }

    let unaryToken = this.next()
    let unaryOp;

    switch (unaryToken.type) {
      case TT_ADD:
        unaryOp = UNARY_POS
        break
      case TT_SUB:
        unaryOp = UNARY_NEG
        break
      default:
        unaryOp = UNARY_ABS
        break
    }

    let expr = this.callExpr()

    if (unaryToken.type == TT_ABSW) {
      this.expect(TT_ABSW)
    }

    return {
      type: IR_UNARY,
      operation: unaryOp,
      target: expr,
      loc: unaryToken.loc
    }
  }

  isUnary(type) {
    return type == TT_ADD || type == TT_SUB || type == TT_ABSW
  }

  callExpr() {
    let expr = this.primaryExpr()

    if (this.peek().type != TT_LPAREN) {
      return expr
    }

    let args = []

    while (!this.matches(TT_RPAREN)) {
      let expr = this.expr()
      args += expr

      if (this.matches(TT_COMMA)) {
        this.next()
        continue
      }

      if (!this.matches(TT_RPAREN)) {
        error("Expected either , or )", this.peek().loc)
      }
    }

    return { 
      type: IR_CALL, 
      args: args, 
      target: expr, 
      loc: expr.loc 
    }
  }

  primaryExpr() {
    let type = this.peek().type;

    switch(type) {
      case TT_ID:
      case TT_NUM:
        return this.next()

      default:
        return {type: IR_ERR, loc: type.loc, value: type.value}
    }
  }

}

class Slot {
  constructor(value) {
    this.value = value
  }
}

class Scope {
  constructor(parent = null) {
    this.__parent = parent
  }

  __getSlot(key) {
    let direct = this[key]

    if (direct != null) {
      return direct
    }

    let parent = this.__parent

    if (parent == null) {
      return undefined
    }

    return parent.__getValue(key)
  }

  __defineSlot(key, value) {
    let slot = new Slot(value)
    this[key] = slot
  }
}

function createScopeProxy() {
  return {
    get(obj, key) {
      let slot = obj.__getSlot(key)

      if (slot == null) {
        return null
      }

      return slot.value
    },

    set(obj, key, value) {
      let slot = obj.__getSlot(key)

      if (slot != null) {
        slot.value = value
        return value
      }

      obj.__defineSlot(key, value)
    }
  }
}
