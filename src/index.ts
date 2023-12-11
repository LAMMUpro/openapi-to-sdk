import * as fs from 'fs';
import { Project, Scope, SourceFile } from "ts-morph";
import { OpenAPIObject } from './types/openapi';
import { writeArray, writeStatements } from './utils/index.js';

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
    '父类初始化参数类型'
  ])
  // sourceFile.addStatements(writer => writeArray(writer, [
  //   '/**',
  //   ' * 父类初始化参数类型',
  //   ' */'
  // ]));

  sourceFile.addInterface({
    name: 'OptionsType',
    properties: [
      {
        name: 'baseUrl',
        hasQuestionToken: true,
        type: 'string'
      },
      {
        name: 'request',
        type: 'typeof request'
      }
    ],
  })
}

/**
 * 生成公共方法
 */
function generateCommonFunction(sourceFile: SourceFile, openapiObject: OpenAPIObject) {
  sourceFile.addStatements(writer => writer.newLine() && writeArray(writer, [
    '/**',
    ' * 请求方法(默认)',
    ' */'
  ]));

  sourceFile.addFunction({
    name: 'request',
    parameters: [
      {
        name: 'options',
        type: write => writeArray(write, [
          '{',
          `  method: 'get' | 'post' | 'delete' | 'put'`,
          '  url: string',
          '}'
        ])
      }
    ],
    returnType: '{}',
    statements: [
      'return fetch(options.url, {',
      'method: options.method,',
      '})'
    ]
  })
}

/**
 * 生成公共类
 */
function generateCommonClass(sourceFile: SourceFile, openapiObject: OpenAPIObject) {
  writeStatements(sourceFile, [
    '请求类封装'
  ])

  const Request = sourceFile.addClass({
    name: "Request",
  })

  /** constructor */
  Request.addConstructor({
    parameters: [
      {
        name: 'options',
        hasQuestionToken: true,
        type: 'Partial<OptionsType>'
      }
    ],
    statements: 'if (options) this.init(options);'
  });

  /** baseUrl<属性> */
  Request.addProperty({
    name: "baseUrl",
    type: "string",
    hasQuestionToken: true,
    scope: Scope.Private,
  }).addJsDoc('请求公共url');

  /** request方法<属性> */
  Request.addProperty({
    name: "request",
    type: "typeof request",
    hasQuestionToken: true,
    scope: Scope.Private,
  }).addJsDoc('请求公共url');

  /** init<方法> */
  Request.addMethod({
    name: "init",
    parameters: [
      {
        name: 'options',
        type: 'Partial<OptionsType>'
      }
    ],
    statements: [
      'this.baseUrl = options.baseUrl;',
      'this.request = options.request;'
    ]
  }).addJsDoc('初始化sdk');

  /** 发送http请求<方法> */
  Request.addMethod({
    name: "sendRequest",
    typeParameters: [{ name: "T" }],
    parameters: [
      {
        name: 'options',
        type: write => writeArray(write, [
          '{',
          `method: 'get' | 'post' | 'delete' | 'put'`,
          'path: string', 
          '}'
        ])
      }
    ],
    statements: [
      'const api = this.request || request;',
      `console.log('发送请求', options);`,
      'const res = await api({',
      'method: options.method,',
      'url: `${this.baseUrl}${options.path}`',
      '});',
      'return res as any as T'
    ],
    scope: Scope.Private,
    isAsync: true,
  }).addJsDoc('发送http请求');

  /** 发送get请求<方法> */
  Request.addMethod({
    name: "get",
    typeParameters: [{ name: "T" }],
    parameters: [
      {
        name: 'path',
        type: 'string'
      }
    ],
    statements: [
      'return this.sendRequest<T>({',
      `method: 'get',`,
      'path,',
      '})',
    ],
    scope: Scope.Protected,
    isAsync: true,
  }).addJsDoc('发送get请求');
}

/**
 * 生成xx
 */
function generateA(sourceFile: SourceFile, openapiObject: OpenAPIObject) {

  const paths = Object.keys(openapiObject.paths);

  paths.forEach(path=> {

  })
}

function main() {
  const openapiObject = parseOpenApiFile('./swagger.demo.json');
  const sdkFileName = 'nestSDK.ts';
  if (fs.existsSync(sdkFileName)) fs.rmSync(sdkFileName);
  const project = new Project();
  const sourceFile = project.createSourceFile(sdkFileName, "");

  /** 生成公共类型 */
  generateCommonType(sourceFile, openapiObject);

  /** 生成公共方法 */
  generateCommonFunction(sourceFile, openapiObject);

  /** 生成公共类 */
  generateCommonClass(sourceFile, openapiObject);

  /** 生成xx */
  generateA(sourceFile, openapiObject);

  sourceFile.formatText({
    indentSize: 2,
    convertTabsToSpaces: true,
  });

  console.log(sourceFile.getFullText());

  sourceFile.saveSync();
}

main();
