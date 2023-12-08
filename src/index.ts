import * as fs from 'fs';
import { Project, SyntaxKind } from "ts-morph";

/**
 * 解析openapi文件，得到object对象
 * @param filePath 文件路径
 * @returns openapi对象
 */
function parseOpenApiFile(filePath: string) {
  const contentStr = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(contentStr);
}

function main() {
  const openapiObject = parseOpenApiFile('./swagger.demo.json');
  const project = new Project();
  const sourceFile = project.createSourceFile('nestSDK.ts', "");
  console.log(sourceFile)
  // const classDeclaration = sourceFile.addClass({
  //   name: "ExampleClass",
  // });

  // classDeclaration.addProperty({
  //   name: "exampleProperty",
  //   type: "string",
  //   initializer: `"Hello, World!"`,
  // });
  
  // const exampleMethod = classDeclaration.addMethod({
  //   name: "exampleMethod",
  //   returnType: "void",
  // });
  // exampleMethod.setBodyText(`console.log(this.exampleProperty);`);

  // sourceFile.formatText({
  //   indentSize: 2,
  //   convertTabsToSpaces: true,
  // });

  // console.log(sourceFile.getFullText());
}

main();
