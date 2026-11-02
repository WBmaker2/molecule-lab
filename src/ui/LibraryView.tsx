import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { displayFormula } from '../chem/analysis';
import { getElement } from '../chem/elements';
import { MOLECULE_CATEGORIES, MOLECULES, getMolecule } from '../chem/molecules';
import type { MoleculeData } from '../chem/types';
import { PreviewScene } from '../scene/PreviewScene';
import { useAppStore } from '../stores/appStore';
import { useBuildStore } from '../stores/buildStore';
import { MoleculeDiagram } from './MoleculeDiagram';
import { ArrowIcon, CloseIcon, SparkIcon } from './icons';

export function LibraryView() {
  const [category, setCategory] = useState('전체');
  const [dialogId, setDialogId] = useState<string | null>(null);
  const setView = useAppStore((state) => state.setView);
  const loadMolecule = useBuildStore((state) => state.loadMolecule);
  const filtered = useMemo(
    () =>
      category === '전체'
        ? MOLECULES
        : MOLECULES.filter((molecule) => molecule.category === category),
    [category],
  );
  const dialogMolecule = dialogId ? getMolecule(dialogId) : null;

  const closeDialog = useCallback(() => setDialogId(null), []);
  const startBuilding = useCallback(
    (molecule: MoleculeData, mode: 'complete' | 'target') => {
      loadMolecule(molecule.id, mode);
      setDialogId(null);
      setView('build');
    },
    [loadMolecule, setView],
  );

  return (
    <section className="view library-view" aria-labelledby="library-title">
      <div className="view-heading">
        <div className="view-heading-copy">
          <span className="view-kicker">분자 도감</span>
          <h2 id="library-title">12개의 분자 표본을 만나 보세요</h2>
          <p>
            생명과 환경, 연소와 기체, 산과 염기, 유기 화학을 대표하는 분자입니다. 구조를 살펴보고
            같은 모형을 실험대에서 직접 조립해 보세요.
          </p>
        </div>
        <div className="library-summary">
          <SparkIcon />
          <div>
            <strong>{MOLECULES.length}종</strong>
            <span>3D 구조 · 한글 해설</span>
          </div>
        </div>
      </div>

      <div className="filter-bar" role="group" aria-label="분자 분류">
        {MOLECULE_CATEGORIES.map((value) => {
          const count =
            value === '전체'
              ? MOLECULES.length
              : MOLECULES.filter((molecule) => molecule.category === value).length;
          return (
            <button
              key={value}
              type="button"
              className={`filter-chip${category === value ? ' is-active' : ''}`}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {value}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="specimen-grid">
        {filtered.map((molecule) => {
          const index = MOLECULES.findIndex((candidate) => candidate.id === molecule.id) + 1;
          return (
            <article
              key={molecule.id}
              className="specimen-card"
              style={
                {
                  '--specimen-accent': molecule.accent,
                  '--card-index': index,
                } as CSSProperties
              }
              data-testid={`molecule-${molecule.id}`}
            >
              <div className="specimen-head">
                <span className="specimen-number">No. {String(index).padStart(2, '0')}</span>
                <span className="specimen-category">{molecule.category}</span>
              </div>
              <MoleculeDiagram molecule={molecule} className="specimen-diagram" />
              <div className="specimen-body">
                <div className="specimen-title">
                  <h3>
                    {molecule.nameKo}
                    <span>{molecule.nameEn}</span>
                  </h3>
                  <strong aria-label={molecule.formula}>{displayFormula(molecule.formula)}</strong>
                </div>
                <div className="specimen-tags">
                  <span>{molecule.shapeKo}</span>
                  <span>{molecule.polarityKo}</span>
                  <span>{molecule.angleKo}</span>
                </div>
                <p className="specimen-description">{molecule.descriptionKo}</p>
              </div>
              <div className="specimen-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => startBuilding(molecule, 'target')}
                >
                  따라 만들기
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDialogId(molecule.id)}
                >
                  자세히
                  <ArrowIcon />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {dialogMolecule ? (
        <MoleculeDialog molecule={dialogMolecule} onClose={closeDialog} onStart={startBuilding} />
      ) : null}
    </section>
  );
}

interface MoleculeDialogProps {
  molecule: MoleculeData;
  onClose: () => void;
  onStart: (molecule: MoleculeData, mode: 'complete' | 'target') => void;
}

function MoleculeDialog({ molecule, onClose, onStart }: MoleculeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="molecule-dialog"
      aria-labelledby="molecule-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-card">
        <header className="dialog-head">
          <div>
            <span className="dialog-kicker">
              {molecule.category} · 표본 No.{' '}
              {String(
                MOLECULES.findIndex((candidate) => candidate.id === molecule.id) + 1,
              ).padStart(2, '0')}
            </span>
            <h2 id="molecule-dialog-title">
              {molecule.nameKo}
              <span>{molecule.nameEn}</span>
            </h2>
          </div>
          <div className="dialog-formula" aria-label={molecule.formula}>
            {displayFormula(molecule.formula)}
          </div>
          <button type="button" className="icon-button dialog-close" onClick={onClose} autoFocus>
            <CloseIcon />
            <span className="sr-only">분자 정보 닫기</span>
          </button>
        </header>

        <div className="dialog-grid">
          <div className="dialog-preview">
            <PreviewScene
              molecule={molecule}
              autoRotate
              showLabels
              ariaLabel={`${molecule.nameKo} 분자 3D 구조`}
            />
            <span className="preview-note">끌어서 회전</span>
          </div>
          <div className="dialog-info">
            <p className="dialog-description">{molecule.descriptionKo}</p>
            <dl className="dialog-stats">
              <div>
                <dt>분자 모양</dt>
                <dd>{molecule.shapeKo}</dd>
              </div>
              <div>
                <dt>극성</dt>
                <dd>{molecule.polarityKo}</dd>
              </div>
              <div>
                <dt>결합각</dt>
                <dd>{molecule.angleKo}</dd>
              </div>
              <div>
                <dt>원자 구성</dt>
                <dd>
                  {molecule.atoms
                    .map((atom) => atom.element)
                    .filter((element, index, array) => array.indexOf(element) === index)
                    .map((element) => getElement(element).nameKo)
                    .join(' · ')}
                </dd>
              </div>
            </dl>
            <div className="dialog-fact">
              <span>알고 있나요</span>
              <p>{molecule.factKo}</p>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-primary btn-pulse"
                onClick={() => onStart(molecule, 'target')}
              >
                실험대에서 따라 만들기
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onStart(molecule, 'complete')}
              >
                완성된 모형 놓기
              </button>
            </div>
            <p className="dialog-caveat">결합각과 크기는 학습을 위해 단순화한 대표값입니다.</p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
