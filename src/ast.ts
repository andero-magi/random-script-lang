import { FileLocation } from "./tokens"

export interface NodeVisitor<C, R> {
  
  visitNumLiteral(expr: NumberLiteral, ctx: C): R

  visitString(expr: StringLiteral, ctx: C): R

  visitBoolean(expr: BooleanLiteral, ctx: C): R

  visitId(expr: Identifier, ctx: C): R

  visitBinary(expr: BinaryExpr, ctx: C): R

  visitUnary(expr: UnaryExpr, ctx: C): R
}

export interface Node {
  location: FileLocation

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R
}

export interface Expr extends Node {

}

export class Identifier implements Expr {
  value: string
  location: FileLocation

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R {
    return visitor.visitId(this, ctx)
  }
}

export class StringLiteral implements Expr {
  value: string
  location: FileLocation

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R {
    return visitor.visitString(this, ctx)
  }
}

export class NumberLiteral implements Expr {
   location: FileLocation
   value: number

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R {
    return visitor.visitNumLiteral(this, ctx)
  }
}

export class BooleanLiteral implements Expr {
  location: FileLocation
  value: boolean

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R {
      return visitor.visitBoolean(this, ctx)
  }
}

export enum BinaryOperation {
  ADD,
  SUB,
  DIV,
  MUL,
  POW,
  LT,
  GT,
  LTE,
  GTE,
  EQ,
  NEQ
}

export class BinaryExpr implements Expr {
  location: FileLocation
  lhs: Expr
  rhs: Expr
  op: BinaryOperation

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R {
      return visitor.visitBinary(this, ctx)
  }
}

export enum UnaryOperation {
  POS,
  NEG,
  ABS,
}

export class UnaryExpr implements Expr {
  location: FileLocation
  expr: Expr
  op: UnaryOperation

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R {
      return visitor.visitUnary(this, ctx)
  }
}