import * as fs from 'fs';

const content = fs.readFileSync('./package.json', 'utf-8');
console.log(content);