import * as fs from 'fs';
import { ClassDeclaration, Project, Scope, SourceFile } from "ts-morph";
import { ContentObject, OpenAPIObject, OperationObject, PathItemObject, ReferenceObject } from './types/openapi';
import { addModelDep, paramList2Define, pickModelNameFromRef, writeArray, writeStatements } from './utils/index.js';

/**
 * 解析openapi文件，得到object对象
 * @param filePath 文件路径
 * @returns openapi对象
 */
function parseOpenApiFile(filePath: string): OpenAPIObject {
  const contentStr = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(contentStr);
}

/**
 * 生成公共类型
 */
function generateCommonType(sourceFile: SourceFile, openapiObject: OpenAPIObject) {
  writeStatements(sourceFile, [
    '基础对象'
  ])
  sourceFile.addInterface({
    name: 'BaseObj',
    typeParameters: [{ name: "T", default: 'any' }],
    properties: [
      {
        name: '[key: string]',
        type: 'T',
      },
    ],
  })

  writeStatements(sourceFile, [
    '请求类初始化参数类型'
  ])
  sourceFile.addInterface({
    name: 'RequestInitType',
    properties: [
      {
        docs: ['请求url中的baseUrl'],
        name: 'origin',
        hasQuestionToken: true,
        type: 'string',
      },
      {
        docs: ['自定义请求函数, 默认使用fetch'],
        name: 'request',
        type: 'typeof _fetch_',
      }
    ],
  })

  writeStatements(sourceFile, [
    '请求方法的接口'
  ])
  sourceFile.addInterface({
    name: 'RequestType',
    properties: [
      {
        docs: ['请求方法'],
        name: 'method',
        type: `'get' | 'post' | 'delete' | 'put'`,
      },
      {
        docs: ['路径(不包含origin)'],
        name: 'path',
        type: 'string',
      },
      {
        docs: ['路径参数'],
        name: 'query',
        hasQuestionToken: true,
        type: 'BaseObj',
      },
      {
        docs: ['body参数'],
        name: 'data',
        hasQuestionToken: true,
        type: 'any',
      },
      {
        docs: ['请求头'],
        name: 'headers',
        hasQuestionToken: true,
        type: 'BaseObj',
      }
    ],
  })
}

/**
 * 生成公共方法
 */
function generateCommonFunction(sourceFile: SourceFile, openapiObject: OpenAPIObject) {
  writeStatements(sourceFile, [
    '请求方法(默认)',
    '带请求结果处理过程'
  ])
  sourceFile.addFunction({
    name: '_fetch_',
    isAsync: true,
    typeParameters: [{ name: 'T' }],
    parameters: [
      {
        name: 'options',
        type: 'RequestType'
      }
    ],
    statements: [
      'const res = await fetch(options.path, options);',
      'const result: T = await res.json();',
      'return result;',
    ]
  })

  writeStatements(sourceFile, [
    '请求path的动态参数替换 //TODO，gpt写的函数，待测试',
    "@example replacePathParams('/page-node/{typeId}/{id}', {id: 1, typeId: 2}) => /page-node/2/1"
  ])
  sourceFile.addFunction({
    name: 'replacePathParams',
    parameters: [
      {
        name: 'path',
        type: 'string'
      },
      {
        name: 'query',
        type: 'any'
      }
    ],
    statements: [
      'const regex = /{([^}]+)}/g; // 匹配动态参数的正则表达式',
      'let replacedPath = path.replace(regex, (match, param) => {',
      'const value = query[param]; // 从查询参数中获取对应的值',
      'return value !== undefined ? String(value) : match; // 如果值存在，则进行替换；否则保持原样',
      '});',
      'return replacedPath;',
    ]
  })
}

/**
 * 生成请求类
 */
function generateCommonClass(sourceFile: SourceFile, openapiObject: OpenAPIObject) {
  writeStatements(sourceFile, [
    '请求类封装'
  ])

  const Request = sourceFile.addClass({
    name: "Request",
  })

  Request.addConstructor({
    parameters: [
      {
        name: 'options',
        hasQuestionToken: true,
        type: 'Partial<RequestInitType>'
      }
    ],
    statements: 'if (options) this.init(options);'
  });

  /** origin<属性> */
  Request.addProperty({
    name: "origin",
    type: "string",
    hasQuestionToken: true,
    scope: Scope.Private,
  }).addJsDoc('请求baseUrl');

  /** request方法<属性> */
  Request.addProperty({
    name: "request",
    scope: Scope.Private,
    initializer: '_fetch_',
  }).addJsDoc('请求方法, 带请求结果处理过程');

  /** init<方法> */
  Request.addMethod({
    name: "init",
    parameters: [
      {
        name: 'options',
        type: 'Partial<RequestInitType>'
      }
    ],
    statements: [
      'this.origin = options.origin;',
      'this.request = options.request || _fetch_;'
    ]
  }).addJsDoc('初始化sdk');

  /** 发送http请求<方法> */
  Request.addMethod({
    name: "sendRequest",
    typeParameters: [{ name: "T" }],
    parameters: [
      {
        name: 'options',
        type: 'RequestType',
      }
    ],
    statements: [
      'const path = replacePathParams(options.path, options.query);',
      'const res = await this.request<T>({',
      '...options,',
      'path: `${this.origin}${path}`',
      '});',
      'return res;',
    ],
    scope: Scope.Protected,
    isAsync: true,
  }).addJsDoc('发送http请求');
}

/**
 * 生成关键sdk
 */
function generateSdk(NestSDK: ClassDeclaration, controllerName: string, controller: {[key: string]: OperationObject & {
  method: 'get'|'post'|'put'|'delete'
  path: string
}}, deps: { [key:string]: Array<string> }) {
  /** 控制器请求方法集合 */
  const initializerArray: string[] = [];
  
  Object.keys(controller).forEach(functionName=>{
    if (controller[functionName].description) {
      initializerArray.push(`/** ${controller[functionName].description} */`)
    } else {
      initializerArray.push(`/** 该请求没有写备注! */`)
    }

    /**
     * 响应类型
     */
    let responseType = '';
    /** content有则是配置了响应 */
    const responseObject = controller[functionName].responses?.['default']?.content;
    const schema = responseObject?.['application/json']?.schema;
    if (schema && '$ref' in schema) {
      const modelName = pickModelNameFromRef(schema.$ref);
      if (modelName) responseType = `<${modelName}>`;

      addModelDep(deps, modelName);
    }

    /**
     * 请求参数
     */
    let paramList: Array<{name: 'query'|'data', type?: string, default?: any, required?: boolean}> = [];
    /** 处理函数请求中的query */
    if (controller[functionName].parameters?.length) {
      paramList.push({ name: 'query', type: `{
        ${controller[functionName].parameters!.map(item => 
          `/** ${item.description || ''} */
          ${item.name}${item.required?'':'?'}: ${(item.schema as any).type}`
        ).join('\n')}
      }` })
    }
    /** 处理函数请求中的body */
    const requestBody = controller[functionName].requestBody;
    if (requestBody) {
      if ('content' in requestBody) {
        const schema = requestBody.content['application/json'].schema || {};
        if ('$ref' in schema) {
          const modelName = pickModelNameFromRef(schema.$ref);
          paramList.push({ name: 'data', type: modelName });
          addModelDep(deps, modelName);
        }
      }
    }

    const paramDefine = paramList2Define(paramList);

    initializerArray.push(...[
      /** 远程方法调用函数 */
      `${functionName}: (`,
        `${paramDefine}${paramList.find(item=>item.name=='data')?`${paramDefine?',\nvalidate = false':'validate = false'}`:''}`,
      `) => {`,
        ...[paramList.find(item=>item.name=='data')?`if (validate && ${paramList.find(item=>item.name=='data')?.type}.safeParse(data)) return;`:''].filter(Boolean),
        `return this.sendRequest${responseType}({`,
          ...paramList.map(item=> `${item.name},`),
          `method: '${controller[functionName].method}',`,
          `path: '${controller[functionName].path}'`,
        `})`,
      '},',
    ])
  })

  /** 控制器对象(内部) */
  NestSDK.addProperty({
    name: `_${controllerName}`,
    scope: Scope.Private,
    initializer: writer => writeArray(writer, [
      '{',
      ...initializerArray,
      '}'
    ])
  });

  /** 只读控制器对象(外部调用) */
  NestSDK.addProperty({
    name: `${controllerName}`,
    isReadonly: true,
    type: `Readonly<typeof this._${controllerName}>`,
    initializer: `this._${controllerName}`
  });
}

/**
 * 循环生成sdk
 */
function generateSdks(sourceFile: SourceFile, openapiObject: OpenAPIObject, deps: { [key:string]: Array<string> }) {

  writeStatements(sourceFile, [
    'SDK'
  ])

  const NestSDK = sourceFile.addClass({
    name: "NestSDK",
    isExported: true,
    extends: 'Request',
  })

  /** constructor */
  NestSDK.addConstructor({
    parameters: [
      {
        name: 'options',
        hasQuestionToken: true,
        type: 'Partial<RequestInitType>'
      }
    ],
    statements: 'super(options);'
  });

  const paths = Object.keys(openapiObject.paths);
  const controllerMap: {[key: string]: {[key: string]:OperationObject & {
    method: 'get'|'post'|'put'|'delete'
    path: string
  }}} = {};
  paths.forEach(path=> {
    const methods = (Object.keys(openapiObject.paths[path]) as Array<'get'|'post'|'put'|'delete'>).filter(method=>['get', 'post', 'put', 'delete'].includes(method));
    methods.forEach(method=>{
      let [controllerName, functionName] = openapiObject.paths[path][method]?.operationId?.split('_') as [string, string];
      if (!controllerMap[controllerName]) {
        controllerMap[controllerName] = {};
      }
      /** 重名情况!! */
      if (controllerMap[controllerName][functionName]) {
        //TODO, 命名
        functionName = functionName + '_2';
      }
      controllerMap[controllerName][functionName] = {
        ...openapiObject.paths[path][method]!,
        method,
        path,
      }
    })

    // ([
    //   { key: 'get', value: openapiObject.paths[path].get },
    //   { key: 'post', value: openapiObject.paths[path].post },
    //   { key: 'put', value: openapiObject.paths[path].put },
    //   { key: 'delete', value: openapiObject.paths[path].delete },
    // ] as const).filter(item=>item.value).map(item=>generateSdk(NestSDK, path, item.key, item.value!))
  })
  Object.keys(controllerMap).forEach(controllerName=>{
    generateSdk(NestSDK, controllerName, controllerMap[controllerName], deps);
  })
}

function main() {
  /** 依赖 */
  const deps: { [key:string]: Array<string> } = {};
  const openapiObject = parseOpenApiFile('./swagger.demo.json');
  const sdkFileName = 'nestSDK.ts';
  if (fs.existsSync(sdkFileName)) fs.rmSync(sdkFileName);
  const project = new Project();
  const sourceFile = project.createSourceFile(sdkFileName, "");

  /** 生成公共类型 */
  generateCommonType(sourceFile, openapiObject);

  /** 生成公共方法 */
  generateCommonFunction(sourceFile, openapiObject);

  /** 生成请求类 */
  generateCommonClass(sourceFile, openapiObject);

  /** 生成关键sdk */
  generateSdks(sourceFile, openapiObject, deps);

  sourceFile.formatText({
    indentSize: 2,
    convertTabsToSpaces: true,
  });

  /** 导入依赖 */
  Object.keys(deps).forEach(path=>{
    sourceFile.addImportDeclaration({
      moduleSpecifier: path,
      namedImports: deps[path],
    })
  })
  
  // console.log(sourceFile.getFullText());

  sourceFile.saveSync();
}

main();
