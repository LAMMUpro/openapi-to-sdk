import * as fs from 'fs';

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
}

main();
