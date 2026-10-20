// Llista que es pot reordenar arrossegant els elements o amb les fletxes (accessible amb teclat).
import { useState } from 'react';
import type { ReactNode } from 'react';
import { t } from '../../i18n';

export function LlistaOrdenable<T>(props: {
  items: T[];
  clau: (item: T) => string;
  onChange: (items: T[]) => void;
  render: (item: T, actualitza: (nou: T) => void, treu: () => void) => ReactNode;
}) {
  const [arrossegant, setArrossegant] = useState<number | null>(null);
  const [sobre, setSobre] = useState<number | null>(null);
  const { items, onChange } = props;

  const mou = (de: number, a: number) => {
    if (a < 0 || a >= items.length || de === a) return;
    const nous = [...items];
    const [x] = nous.splice(de, 1);
    nous.splice(a, 0, x);
    onChange(nous);
  };

  return (
    <ol className="llista-ordenable">
      {items.map((item, i) => (
        <li
          key={props.clau(item)}
          className={`${arrossegant === i ? 'arrossegant' : ''}${sobre === i && arrossegant !== i ? ' sobre' : ''}`}
          draggable
          onDragStart={(e) => {
            setArrossegant(i);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(i));
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setSobre(i);
          }}
          onDragLeave={() => setSobre((s) => (s === i ? null : s))}
          onDrop={(e) => {
            e.preventDefault();
            if (arrossegant !== null) mou(arrossegant, i);
            setArrossegant(null);
            setSobre(null);
          }}
          onDragEnd={() => {
            setArrossegant(null);
            setSobre(null);
          }}
        >
          <span className="nansa" aria-hidden="true">
            ⋮⋮
          </span>
          <div className="llista-ordenable-cos">
            {props.render(
              item,
              (nou) => onChange(items.map((x, j) => (j === i ? nou : x))),
              () => onChange(items.filter((_, j) => j !== i)),
            )}
          </div>
          <span className="fletxes">
            <button type="button" className="enllac" onClick={() => mou(i, i - 1)} disabled={i === 0} aria-label={t("Puja")} title={t("Puja")}>
              ↑
            </button>
            <button type="button" className="enllac" onClick={() => mou(i, i + 1)} disabled={i === items.length - 1} aria-label={t("Baixa")} title={t("Baixa")}>
              ↓
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}
