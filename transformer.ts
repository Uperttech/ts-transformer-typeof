import ts from 'typescript'
import path from 'path'
import { Modifiers } from '.'

export default function transformer(program: ts.Program): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => (file: ts.SourceFile) => visitNodeAndChildren(file, program, context)
}

function visitNodeAndChildren(node: ts.SourceFile, program: ts.Program, context: ts.TransformationContext): ts.SourceFile
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined
function visitNodeAndChildren(node: ts.Node, program: ts.Program, context: ts.TransformationContext): ts.Node | undefined {
  return ts.visitEachChild(visitNode(node, program), childNode => visitNodeAndChildren(childNode, program, context), context)
}

function visitNode(node: ts.SourceFile, program: ts.Program): ts.SourceFile
function visitNode(node: ts.Node, program: ts.Program): ts.Node | undefined
function visitNode(node: ts.Node, program: ts.Program): ts.Node | undefined {
  const typeChecker = program.getTypeChecker()
  if (isValueOfImportExpression(node)) {
    return
  }
  if (!isValueOfCallExpression(node, typeChecker)) {
    return node
  }
  if (!node.typeArguments) {
    return ts.factory.createObjectLiteralExpression([])
  }

  return generateTypeInfoObject(node.typeArguments[0], typeChecker)
}

type PartialRecord<K extends keyof any, T> = {
  [P in K]?: T
}

const kindTypeIdentifier: PartialRecord<ts.SyntaxKind, string> = {
  [ts.SyntaxKind.FunctionDeclaration]: 'function',
  [ts.SyntaxKind.FunctionKeyword]: 'function',
  [ts.SyntaxKind.NullKeyword]: 'null',
  [ts.SyntaxKind.BooleanKeyword]: 'boolean',
  [ts.SyntaxKind.StringKeyword]: 'string',
  [ts.SyntaxKind.NumberKeyword]: 'number',
  [ts.SyntaxKind.ObjectKeyword]: 'object',
  [ts.SyntaxKind.ArrayType]: 'array',
  [ts.SyntaxKind.BigIntKeyword]: 'bigint'
}

function getTypeIdenfierBySyntaxKind(kind?: ts.SyntaxKind): string {
  if (!kind) {
    return "null"
  }

  return kindTypeIdentifier[kind] || 'object'
}

function getDecoratorName(expression: ts.LeftHandSideExpression): string {
  const escapedText = (expression as ts.Identifier).escapedText

  if (!escapedText) {
    const nestedExpression = (expression as any).expression

    return nestedExpression ? getDecoratorName(nestedExpression) : "undefined"
  }

  return escapedText
}

function getPropertyModifiers(property: ts.Symbol): Modifiers {
  const modifiers = property?.valueDeclaration?.modifiers || [] 

  return {
    readonly: modifiers.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword),
    optional: !!(property?.valueDeclaration as ts.ParameterDeclaration)?.questionToken
  }
}

function getTypeName(type: ts.Type): string {
  if (type.aliasSymbol) {
    return ""+type.aliasSymbol.escapedName
  }

  if (type.symbol) {
    return ""+type.symbol.escapedName
  }

  return ""
}


function generateTypeInfoObject(typeNode: ts.TypeNode, typeChecker: ts.TypeChecker): ts.ObjectLiteralExpression {
  const type = typeChecker.getTypeFromTypeNode(typeNode)
  const properties = typeChecker.getPropertiesOfType(type)

  return  ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment(
      'name', 
      ts.factory.createStringLiteral(getTypeName(type)) 
    ),
    ts.factory.createPropertyAssignment(
      'decorators', 
      ts.factory.createArrayLiteralExpression(
        properties[0]?.valueDeclaration?.parent?.decorators?.map(
          decorator => ts.factory.createStringLiteral(getDecoratorName(decorator.expression)))
      )
    ),
    ts.factory.createPropertyAssignment(
      'properties',
      ts.factory.createObjectLiteralExpression(
        properties.map(property => ts.factory.createPropertyAssignment(
          property.name,
          ts.factory.createObjectLiteralExpression([
           ts.factory.createPropertyAssignment(
              'type',
                (property.valueDeclaration as ts.ParameterDeclaration)?.type?.kind === ts.SyntaxKind.TypeReference ?
                  generateTypeInfoObject((property.valueDeclaration as ts.ParameterDeclaration)?.type as ts.TypeNode, typeChecker) :
                  ts.factory.createStringLiteral(
                    getTypeIdenfierBySyntaxKind((property.valueDeclaration as ts.ParameterDeclaration)?.type?.kind)
                  )
            ),
            ts.factory.createPropertyAssignment(
              'decorators',
              ts.factory.createArrayLiteralExpression(
                property?.valueDeclaration?.decorators?.map(
                  decorator => ts.factory.createStringLiteral(getDecoratorName(decorator.expression)))
              )
            ),
            ts.factory.createPropertyAssignment(
              'modifiers',
              ts.factory.createObjectLiteralExpression(
                Object.entries(getPropertyModifiers(property)).map(([key, value]) => ts.factory.createPropertyAssignment(key, value ? ts.factory.createTrue() : ts.factory.createFalse()))
            ))
          ]
        )))
    ))
  ])
}

const indexJs = path.join(__dirname, 'index.js')
function isValueOfImportExpression(node: ts.Node): node is ts.ImportDeclaration {
  if (!ts.isImportDeclaration(node)) {
    return false
  }
  const module = (node.moduleSpecifier as ts.StringLiteral).text
  try {
    return indexJs === (
      module.startsWith('.')
        ? require.resolve(path.resolve(path.dirname(node.getSourceFile().fileName), module))
        : require.resolve(module)
    )
  } catch(e) {
    return false
  }
}

const indexTs = path.join(__dirname, 'index.d.ts')
function isValueOfCallExpression(node: ts.Node, typeChecker: ts.TypeChecker): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) {
    return false
  }
  const declaration = typeChecker.getResolvedSignature(node)?.declaration
  if (!declaration || ts.isJSDocSignature(declaration) || declaration.name?.getText() !== 'typeOf') {
    return false
  }
  try {

    return require.resolve(declaration.getSourceFile().fileName) === indexTs
  } catch {
    return false
  }
}
