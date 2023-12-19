import { CodeBlockWriter, SourceFile } from 'ts-morph';

/** 将数组字符串写入到writer */
export function writeArray(writer: CodeBlockWriter, array: string[], newLine = true) {
  array.forEach((str, index) => writer.write(str).conditionalNewLine(newLine))
}

/** 多行注释 */
export function writeStatements(sourceFile: SourceFile, array: string[]) {
  sourceFile.addStatements(writer => {
    writer.write('/**').conditionalNewLine(true);
    array.forEach(statement => writer.write(' * ' + statement).conditionalNewLine(true))
    writer.write(' */').conditionalNewLine(true);
  })
}