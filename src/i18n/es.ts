// Diccionari català → castellà. Clau: text original en català (vegeu src/i18n.ts).
import p1 from './es/part1.ts';
import p2 from './es/part2.ts';
import p3 from './es/part3.ts';
import p4 from './es/part4.ts';
import p5 from './es/part5.ts';
import { modulsEs } from './moduls/index.ts';

const dic: Record<string, string> = { ...p1, ...p2, ...p3, ...p4, ...p5, ...modulsEs };

export default dic;
