import type { CSSProperties } from 'react';
import { useRef } from 'react';
import { PALETTE_ELEMENTS, getElement } from '../chem/elements';
import { getMolecule } from '../chem/molecules';
import { encodeWorkbenchToHash } from '../lib/share';
import { useBuildStore } from '../stores/buildStore';

export function Palette() {
  const atoms = useBuildStore((state) => state.atoms);
  const selectedAtomId = useBuildStore((state) => state.selectedAtomId);
  const targetId = useBuildStore((state) => state.targetId);
  const addAtom = useBuildStore((state) => state.addAtom);
  const selectAtom = useBuildStore((state) => state.selectAtom);
  const clear = useBuildStore((state) => state.clear);
  const loadMolecule = useBuildStore((state) => state.loadMolecule);
  const exportWorkbench = useBuildStore((state) => state.exportWorkbench);
  const importWorkbench = useBuildStore((state) => state.importWorkbench);
  const setNotice = useBuildStore((state) => state.setNotice);
  const fileInput = useRef<HTMLInputElement>(null);
  const target = getMolecule(targetId);

  const saveJson = () => {
    const blob = new Blob([JSON.stringify(exportWorkbench(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `molecule-lab-${target.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice('작업대를 JSON 파일로 저장했습니다.');
  };

  const copyShareLink = async () => {
    const hash = encodeWorkbenchToHash(exportWorkbench());
    const url = `${window.location.origin}${window.location.pathname}#/build?data=${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice('공유 링크를 복사했습니다.');
    } catch {
      setNotice('공유 링크를 복사하지 못했습니다. JSON 저장을 이용하세요.');
    }
  };

  const importJsonFile = (file: File | undefined) => {
    if (!file) return;
    void file
      .text()
      .then((text) => importWorkbench(JSON.parse(text) as unknown))
      .catch(() => setNotice('JSON 파일을 읽지 못했습니다.'));
  };
  const ordinals = new Map<string, number>();
  const counters = new Map<string, number>();

  return (
    <aside className="panel palette" aria-labelledby="palette-title">
      <div className="panel-heading">
        <div>
          <h3 id="palette-title">원자 서랍</h3>
          <p>눌러서 실험대에 놓으세요</p>
        </div>
        <span className="panel-index">6종</span>
      </div>

      <div className="element-grid" role="group" aria-label="원자 팔레트">
        {PALETTE_ELEMENTS.map((symbol) => {
          const element = getElement(symbol);
          return (
            <button
              key={symbol}
              type="button"
              className="element-button"
              style={
                {
                  '--element-color': element.color,
                  '--element-deep': element.deepColor,
                } as CSSProperties
              }
              onClick={() => addAtom(symbol)}
              aria-label={`${element.nameKo} 원자 추가`}
            >
              <span className="element-orb" aria-hidden="true" />
              <span className="element-copy">
                <strong>
                  {element.symbol} · {element.nameKo}
                </strong>
                <small>원자가 {element.valence}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="panel-divider" />

      <div className="panel-heading panel-heading-compact">
        <div>
          <h3>실험대 위 원자</h3>
          <p>선택해서 결합 도우미를 쓰세요</p>
        </div>
        <span className="panel-index">{atoms.length}</span>
      </div>

      <div className="atom-chip-list">
        {atoms.length === 0 ? (
          <p className="empty-copy">아직 원자가 없습니다. 위에서 원자를 골라 보세요.</p>
        ) : (
          atoms.map((atom) => {
            const element = getElement(atom.element);
            const ordinal = (counters.get(atom.element) ?? 0) + 1;
            counters.set(atom.element, ordinal);
            ordinals.set(atom.id, ordinal);
            return (
              <button
                key={atom.id}
                type="button"
                className={`atom-chip${selectedAtomId === atom.id ? ' is-selected' : ''}`}
                style={{ '--element-color': element.color } as CSSProperties}
                onClick={() => selectAtom(atom.id)}
                aria-pressed={selectedAtomId === atom.id}
                aria-label={`${element.nameKo} ${ordinals.get(atom.id)}번 원자 선택`}
              >
                <span className="chip-dot" aria-hidden="true" />
                <span>
                  {element.symbol}
                  <sub>{ordinals.get(atom.id)}</sub>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="palette-actions">
        <button
          type="button"
          className="btn btn-primary btn-block btn-pulse"
          onClick={() => {
            selectAtom(null);
            loadMolecule(target.id, 'target');
          }}
        >
          {target.nameKo} 목표 새로 놓기
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={clear}>
          실험대 비우기
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={saveJson}>
          작업 JSON 저장
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={copyShareLink}>
          공유 링크 복사
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          onClick={() => fileInput.current?.click()}
        >
          작업 JSON 불러오기
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label="작업 JSON 파일 선택"
          onChange={(event) => {
            importJsonFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>

      <p className="palette-footnote">
        원자를 끌어 다른 원자에 가까이 대면 자석처럼 결합됩니다. 결합된 원자는 고정됩니다.
      </p>
    </aside>
  );
}
