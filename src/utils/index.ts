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

/** 从$ref提取模型类型名称，有可能是空字符串 */
export function pickModelNameFromRef($ref: string) {
  return $ref.split?.('/')?.slice?.(-1)?.[0] || '';
}

/** 参数类型数组转函数参数定义 */
export function paramList2Define(paramList: Array<{name: 'query'|'data'|'validate', type?: string, default?: any, required?: boolean}>) {
  return paramList.map(item => `${item.name}: ${item.type}${item.default?` = ${item.default}`:''}`).join(',\n');
}

/** 添加模型依赖 */
export function addModelDep(deps: { [key:string]: Array<string> }, modelName: string) {
  if (modelName.endsWith('Dto')) {
    const path = './zod';
    if (deps[path]) {
      if (!deps[path].includes(modelName)) deps[path].push(modelName);
    } else {
      deps[path] = [modelName];
    }
  } else if (modelName.includes('Dto')) {
    const dtoModelName = modelName.slice(0, modelName.indexOf('Dto'));
    const path = `./zodExt/${dtoModelName}`;
    if (deps[path]) {
      if (!deps[path].includes(modelName)) deps[path].push(modelName);
    } else {
      deps[path] = [modelName];
    }
  } else {
    console.warn(modelName+'未处理')
  }
}