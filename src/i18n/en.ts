// Diccionari català → anglès. Clau: text original en català (vegeu src/i18n.ts).
import p1 from './en/part1.ts';
import p2 from './en/part2.ts';
import p3 from './en/part3.ts';
import p4 from './en/part4.ts';
import p5 from './en/part5.ts';
import { modulsEn } from './moduls/index.ts';

const dic: Record<string, string> = { ...p1, ...p2, ...p3, ...p4, ...p5, ...modulsEn };

export default dic;
