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
const TT_FLOORDIV = 14 // //
const TT_GT       = 15 // >
const TT_LT       = 16 // <
const TT_GTE      = 17 // >=
const TT_LTE      = 18 // <=
const TT_VARDEC   = 19 // var
const TT_ASSIGN   = 20 // =
const TT_RETURN   = 21 // return
const TT_FUNC     = 22 // func
const TT_LCURL    = 23 // {
const TT_RCURL    = 24 // }

// IR node types
const IR_ERR      = TT_ERR
const IR_ID       = TT_ID
const IR_NUM      = TT_NUM
const IR_CALL     = 3
const IR_UNARY    = 4
const IR_BINARY   = 6
const IR_DECVAR   = 7
const IR_STATL    = 8 // statement list
const IR_RETURN   = 9
const IR_ROOT     = 10
const IR_FUNC     = 11
const IR_EXPRSTAT = 12

// Binary operations
const BINARY_ADD  = 0
const BINARY_SUB  = 1
const BINARY_DIV  = 2
const BINARY_MUL  = 3
const BINARY_POW  = 4
const BINARY_FDIV = 5

// Unary operations
const UNARY_POS   = 0
const UNARY_NEG   = 1
const UNARY_ABS   = 2

// Module imports
const fs = require("fs")
const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout
})

main()

function main() {
  let args = process.argv

  if (args.length < 3) {
    evalLoop()
    return
  }

  fs.readFile(args[2], null, (err, data) => {
    if (err) {
      console.error(`Error reading file: ${err}`)
      return
    }

    if (args.length > 3) {
      let stream = new TokenStream(data.toString())
      let parser = new Parser(stream);

      let ast = parser.parse()

      let omitLocs = args.length > 4 && args[4] == "--omit-locs"

      let replacer = (key, value) => astPrintReplace(key, value, omitLocs)

      let astStr = JSON.stringify(ast, replacer, 2)
      let outfileName = args[3]
  
      fs.unlinkSync(outfileName)

      fs.writeFileSync(outfileName, astStr, err => {
        if (err == null) {
          return
        }

        console.error(err)
      })
    } else {
      evalString(data.toString())
    }
    process.exit()
  })
}

function astPrintReplace(key, value, omitLocs) {
  if (key == "loc" && omitLocs) {
    return undefined
  }

  if (key == "type") {
    switch (value) {
      case IR_ERR: return "IR_ERR"
      case IR_ID: return "IR_ID"
      case IR_NUM: return "IR_NUM"
      case IR_CALL: return "IR_CALL"
      case IR_UNARY: return "IR_UNARY"
      case IR_BINARY: return "IR_BINARY"
      case IR_DECVAR: return "IR_DECVAR"
      case IR_STATL: return "IR_STATL"
      case IR_RETURN: return "IR_RETURN"
      case IR_ROOT: return "IR_ROOT"
      case IR_FUNC: return "IR_FUNC"
      default: return value
    }
  }

  if (value.operation != undefined) {
    let irType = value.type
    let opType = value.operation

    if (irType == IR_UNARY) {
      switch (opType) {
        case UNARY_POS: opType = "POS"
        case UNARY_NEG: opType = "NEG"
        case UNARY_ABS: opType = "ABS"

        default:
          break
      }
    } else {
      switch (opType) {
        case BINARY_ADD: opType = "ADD"
        case BINARY_SUB: opType = "SUB"
        case BINARY_DIV: opType = "DIV"
        case BINARY_MUL: opType = "MUL"
        case BINARY_POW: opType = "POW"
        case BINARY_FDIV: opType = "FDIV"

        default:
          break
      }
    }

    value.operation = opType
  }

  return value
}

function evalLoop(scope = null) {
  readline.question("", answer => {
    if (answer == "leave") {
      process.exit()
      return
    }

    try {
      scope = evalString(answer, scope)
      evalLoop(scope)
    } catch (err) {
      process.stderr.write(`[ERROR] ${err.toString()}\n`)
      evalLoop(scope)
    }
  })
}

function evalString(str, scope = null) {
  let stream = new TokenStream(str)
  let parser = new Parser(stream)

  let expr = parser.parse()
  
  if (scope == null) {
    scope = createRootScope()
  }

  let result = executeNodes(expr, scope)

  console.log(`Exec result: ${JSON.stringify(result, null, 2)}`)

  return scope
}

// ----------------------------------------------------------------------
// ---------------------------- TYPING ----------------------------------
// ----------------------------------------------------------------------

function unknwonBi(operator) {
  throw `Unknown Binary operator: ${operator}`
}

function unknwonUnary(operator) {
  throw `Unknown Unary operator: ${operator}`
}

function unsupportedBiOperator(operator) {
  let opName = ""
  switch (operator) {
    case BINARY_ADD: opName = "+"
    case BINARY_SUB: opName = "-"
    case BINARY_MUL: opName = "*"
    case BINARY_DIV: opName = "/"
    case BINARY_FDIV: opName = "//"

    default:
      unknwonBi(operator)
  }

  throw `Unsupported binary operator: ${opName}`
}

function unsupportedUnaryOperator(operator) {
  let opName = ""

  switch(operator) {
    case UNARY_POS: opName = "+"
    case UNARY_NEG: opName = "-"
    case UNARY_ABS: opName = "|"

    default:
      unknwonBi(operator)
  }

  throw `Unsupported unary operator: ${opName}`
}

const TID_NUM = 0

const TYPES = [
  {
    name: 'number',

    test(value) {
      return typeof value == 'number'
    },

    applyBiOp(lhs, rhs, operator) {
      switch (operator) {
        case BINARY_ADD:  return lhs + rhs
        case BINARY_SUB:  return lhs - rhs
        case BINARY_MUL:  return lhs * rhs
        case BINARY_DIV:  return lhs / rhs
        case BINARY_POW:  return lhs ** rhs
        case BINARY_FDIV: return Math.floor(lhs / rhs)

        default:
          unknwonBi(operator)
      }
    },

    applyUnaryOp(value, operator) {
      switch (operator) {
        case UNARY_ABS: return Math.abs(value)
        case UNARY_NEG: return -value
        case UNARY_POS: return +value

        default:
          unknwonUnary(operator)
      }
    }
  }
]

function valueType(value) {
  switch (typeof value) {
    case 'number':
      return TYPES[TID_NUM]

    default:
      for (let index = 0; index < TYPES.length; index++) {
        const type = TYPES[index]
        
        if (type.test(value)) {
          return type
        }
      }

      throw `Unsupported script type: ${typeof value}, value: ${value}`
  }
}


// ----------------------------------------------------------------------
// -------------------------- EXECUTION ---------------------------------
// ----------------------------------------------------------------------


function createScope(parent = null) {
  let scopeVal = new Scope(parent)
  return scopeVal
}

function createRootScope() {
  let scope = createScope()

  scope.defineSlot("pi", Math.PI)

  scope.defineSlot("sin", Math.sin)
  scope.defineSlot("tan", Math.tan)
  scope.defineSlot("cos", Math.cos)

  scope.defineSlot("min", Math.min)
  scope.defineSlot("max", Math.max)
  scope.defineSlot("log", Math.log)

  scope.defineSlot("atan", Math.atan)
  scope.defineSlot("acos", Math.acos)
  scope.defineSlot("asin", Math.asin)

  scope.defineSlot("tanh", Math.atanh)
  scope.defineSlot("cosh", Math.acosh)
  scope.defineSlot("sinh", Math.asinh)
  
  scope.defineSlot("atanh", Math.atanh)
  scope.defineSlot("acosh", Math.acosh)
  scope.defineSlot("asinh", Math.asinh)

  scope.defineSlot("atan2", Math.atan2)
  scope.defineSlot("floor", Math.floor)
  scope.defineSlot("ceil", Math.ceil)
  scope.defineSlot("sqrt", Math.sqrt)

  return scope
}

function ensureCanDefine(key, scope) {
  if (scope.canDefine(key)) {
    return
  }

  throw `Variable '${key}' has already been defined in this scope`
}

function executeNodes(node, scope) {
  let type
  let value
  let name

  switch(node.type) {
    case IR_NUM:
      return node.value

    case IR_ID:
      let slot = scope.getSlot(node.value)
      

      if (slot == null) {
        throw `Unknown value: '${node.value}'`
      }

      return slot.value

    case IR_CALL:
      let funcObject = executeNodes(node.target, scope)
      let args = []

      for (let i = 0; i < node.args.length; i++) {
        const element = node.args[i]
        args.push(executeNodes(element, scope))
      }

      return funcObject.apply(null, args)

    case IR_BINARY:
      let lhs = executeNodes(node.lhs, scope)
      let rhs = executeNodes(node.rhs, scope)

      type = valueType(lhs)

      return type.applyBiOp(lhs, rhs, node.operation)

    case IR_UNARY:
      let target = executeNodes(node.target, scope)
      type = valueType(target)

      return type.applyUnaryOp(target, node.operation)

    case IR_DECVAR:
      name = node.name.value
      ensureCanDefine(name, scope)

      value = node.value == undefined ? undefined : executeNodes(node.value, scope)
      scope.defineSlot(name, value)

      return undefined

    case IR_ROOT:
    case IR_STATL:
      let statList = node.statements

      for (let index = 0; index < statList.length; index++) {
        let stat = statList[index]

        if (stat.type == IR_RETURN) {
          value = stat.value == undefined ? undefined : executeNodes(stat.value, scope)
          return value
        }

        let shouldReturn = (index == (statList.length - 1) && node.type == IR_ROOT)
        if (shouldReturn && stat.type == IR_EXPRSTAT) {
          stat = stat.expr
        }

        value = executeNodes(stat, scope)

        if (value != undefined && shouldReturn) {
          return value
        }
      }

      return undefined

    case IR_FUNC:
      name = node.name.value
      
      let params = node.params
      let body = node.body

      ensureCanDefine(name, scope)

      let func = (...args) => {
        if (args.length < params.length) {
          throw `Missing arguments!, required: ${params.length}, found: ${args.length}`
        }

        let childScope = createScope(scope)

        for (let index = 0; index < params.length; index++) {
          const element = params[index]
          const argValue = args[index]

          childScope.defineSlot(element.value, argValue)
        }

        return executeNodes(body, childScope)
      }

      scope.defineSlot(name, func)

      return undefined

    case IR_EXPRSTAT:
      executeNodes(node.expr, scope)
      return undefined

    default:
      throw `Unknown IR node type: ${node.type}, node=${node}, typeof.node=${typeof node}`
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

  canDefine(key) {
    let direct = this[key]
    if (direct == null) {
      return true
    }
    return false
  }

  getSlot(key) {
    let direct = this[key]

    if (direct != null) {
      return direct
    }

    let parent = this.__parent

    if (parent == null) {
      return undefined
    }

    return parent.getSlot(key)
  }

  defineSlot(key, value) {
    let slot = new Slot(value)
    this[key] = slot
  }
}

// ----------------------------------------------------------------------
// --------------------------- PARSING ----------------------------------
// ----------------------------------------------------------------------

function ttToString(tt) {
  switch (tt) {
    case TT_EOF: return "EOF"
    case TT_ERR: return "ERR"
    case TT_ID: return "ID"
    case TT_NUM: return "NUM"
    case TT_LPAREN: return "LPAREN"
    case TT_RPAREN: return "RPAREN"
    case TT_MUL: return "MUL"
    case TT_POW: return "POW"
    case TT_DIV: return "DIV"
    case TT_ADD: return "ADD"
    case TT_SUB: return "SUB"
    case TT_ABSW: return "ABSW"
    case TT_GT: return "GT"
    case TT_LT: return "LT"
    case TT_GTE: return "GTE"
    case TT_LTE: return "LTE"
    case TT_VARDEC: return "VARDEC"
    case TT_ASSIGN: return "ASSIGN"
    case TT_RETURN: return "RETURN"
    case TT_FUNC: return "FUNC"
    case TT_LCURL: return "LCURL"
    case TT_RCURL: return "RCURL"
    default: return "UNKNOWN(" + tt + ")"
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
    return message
  }
  
  let lineStart = findLineLimit(input, location.cursor, -1)
  let lineEnd = findLineLimit(input, location.cursor, 1)

  let lineStr = input.substring(lineStart, lineEnd)
  let col = location.col

  let context = `^ On line ${location.line}, column ${col}`

  return `[ERROR] ${message}:\n${lineStr}\n${context.padStart(col - 1 + context.length)}\n`
}


function paddedNum(num) {
  return num.toString().padStart(3)
}

class FileLocation {
  constructor(cursor, line, col) {
    this.cursor = cursor
    this.line = line
    this.col = col
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

    this.currentChar = null

    this.peekedToken = null
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
      return EOF
    }
    return this.input[index]
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
    this.peekedToken = t

    return t
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
        this.skipUntilLineEnd()
        continue
      }

      return
    }
  }

  skipUntilLineEnd() {
    while (true) {
      let ch = this.currentChar

      if (ch == LF || ch == EOF || ch == CR) {
        return
      }

      this.advance()
    }
  }

  isWhitespace(ch) {
    return ch == ' ' || ch == '\n' || ch == '\r'
  }

  parseToken() {
    if (this.currentChar == null) {
      this.advance()
    }

    this.skipWhitespace()

    const loc = this.location

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
      case "{": return this.singleCharToken(TT_LCURL)
      case "}": return this.singleCharToken(TT_RCURL)
      case "|": return this.singleCharToken(TT_ABSW)
      case "+": return this.singleCharToken(TT_ADD)
      case "-": return this.singleCharToken(TT_SUB)
      case ",": return this.singleCharToken(TT_COMMA)
      case "=": return this.singleCharToken(TT_ASSIGN)

      case "/": 
        this.advance()

        if (this.currentChar == '/') {
          this.advance()
          return {type: TT_FLOORDIV, loc: loc}
        }

        return {type: TT_DIV, loc: loc}

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

          switch (id) {
            case "var":
              return {type: TT_VARDEC, loc: loc}

            case "return":
              return {type: TT_RETURN, loc: loc}

            case "func":
              return {type: TT_FUNC, loc: loc}

            default:
              return {type: TT_ID, value: id, loc: loc}
          }
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
      let ch = this.currentChar

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
    let expLast = false
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
      this.stream.error(`Expected ${ttToString(type)}, found ${ttToString(tt.type)}`, tt.loc)
      return undefined
    }

    return tt
  }

  parse() {
    let statements = []
    let firstLoc = this.peek().loc

    while (this.peek().type != TT_EOF) {
      let statement = this.statement()
      statements.push(statement)
    }

    return {type: IR_ROOT, statements: statements, loc: firstLoc}
  }

  statement() {
    let peek = this.peek()

    switch (peek.type) {
      case TT_VARDEC:
        return this.varDec()

      case TT_RETURN:
        return this.returnStat()

      case TT_RETURN:
        return this.funcDec()

      case TT_LCURL:
        return this.blockStat()

      case TT_FUNC:
        return this.funcDec()

      default:
        let expr = this.expr()
        return {type: IR_EXPRSTAT, expr: expr, loc: expr.loc}
    }
  }

  funcDec() {
    let start = this.expect(TT_FUNC)
    let name = this.id()

    let params = []

    this.expect(TT_LPAREN)

    while (!this.matches(TT_RPAREN)) {
      let param = this.id()
      params.push(param)

      if (this.matches(TT_COMMA)) {
        this.next()
        continue
      }

      if (!this.matches(TT_RPAREN)) {
        let p = this.peek()
        this.stream.error(`Expected either , or ), found ${ttToString(p.type)}`, p.loc)
      }
    }

    this.expect(TT_RPAREN)

    let block = this.blockStat()

    return {
      type: IR_FUNC,
      name: name,
      params: params,
      body: block,
      loc: start.loc
    }
  }

  varDec() {
    let start = this.expect(TT_VARDEC)
    let name = this.id()

    if (!this.matches(TT_ASSIGN)) {
      return {type: IR_DECVAR, name: name, loc: start.loc, value: undefined}
    }

    this.next()
    let value = this.expr()

    return {type: IR_DECVAR, name: name, loc: start.loc, value: value}
  }

  returnStat() {
    let start = this.expect(TT_RETURN)

    let startLine = start.loc.line
    let peek = this.peek()

    if (peek.type == TT_EOF || peek.loc.line != startLine) {
      return {type: IR_RETURN, loc: start.loc, value: undefined}
    }

    let expr = this.expr()
    return {type: IR_RETURN, loc: start.loc, value: expr}
  }

  blockStat() {
    let start = this.expect(TT_LCURL)
    let statList = []

    while (!this.matches(TT_RCURL)) {
      let stat = this.statement()

      if (stat.type == IR_ERR) {
        break
      }

      statList.push(stat)
    }

    this.expect(TT_RCURL)

    return {type: IR_STATL, statements: statList, loc: start.loc}
  }

  expr() {
    return this.binaryExpr()
  }

  binaryExpr() {
    let lhs = this.unaryExpr()

    while (this.isBinary(this.peek().type)) {
      let token = this.next()

      let rhs = this.unaryExpr()
      let binaryOp
  
      switch (token.type) {
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
        case TT_FLOORDIV:
          binaryOp = BINARY_FDIV
          break
        
        default:
          this.error("idk lmao", token.loc)
      }
  
      lhs = {
        type: IR_BINARY,
        operation: binaryOp,
        lhs: lhs,
        rhs: rhs,
        loc: lhs.loc
      }
    }

    return lhs
  }

  isBinary(ttype) {
    switch (ttype) {
      case TT_ADD:
      case TT_MUL:
      case TT_POW:
      case TT_DIV:
      case TT_SUB:
      case TT_FLOORDIV:
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
    let unaryOp

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

    let expr = this.expr()

    if (unaryOp == UNARY_ABS) {
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

    this.next()
    let args = []

    while (!this.matches(TT_RPAREN)) {
      let expr = this.expr()
      args.push(expr)

      if (this.matches(TT_COMMA)) {
        this.next()
        continue
      }

      if (!this.matches(TT_RPAREN)) {
        let p = this.peek()
        this.error(`Expected either , or ) found ${ttToString(p.type)}`, p.loc)
      }
    }

    this.expect(TT_RPAREN)

    return { 
      type: IR_CALL, 
      args: args, 
      target: expr, 
      loc: expr.loc 
    }
  }

  primaryExpr() {
    let type = this.peek().type

    switch(type) {
      case TT_ID:
        return this.id()

      case TT_NUM:
        return this.next()

      case TT_LPAREN:
        this.next()
        let expr = this.expr()
        this.expect(TT_RPAREN)
        return expr

      default:
        return {type: IR_ERR, loc: type.loc, value: type.value}
    }
  }

  id() {
    let tt = this.expect(TT_ID)
    return {type: TT_ID, value: tt.value, loc: tt.loc}
  }
}
