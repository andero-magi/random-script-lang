import { FileLocation } from "./tokens"

export interface NodeVisitor<C, R> {
  
  visitNumLiteral(expr: NumberLiteral, ctx: C): R
}

export interface Node {
  location: FileLocation

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R
}

export interface Expr extends Node {

}

export class NumberLiteral implements Expr {
   location: FileLocation
   value: number

  visit<C, R>(visitor: NodeVisitor<C, R>, ctx: C): R {
    return visitor.visitNumLiteral(this, ctx)
  }

}