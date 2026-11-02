import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { displayFormula } from '../chem/analysis';
import { getElement } from '../chem/elements';
import { ION_GROUPS, IONS, ionKindKo } from '../chem/ions';
import { MOLECULE_CATEGORIES, MOLECULES, getMolecule } from '../chem/molecules';
import { getReaction } from '../chem/reactions';
import type { MoleculeData } from '../chem/types';
import { PreviewScene } from '../scene/PreviewScene';
import { useAppStore } from '../stores/appStore';
import { useBuildStore } from '../stores/buildStore';
import { useReactionStore } from '../stores/reactionStore';
import { MoleculeDiagram } from './MoleculeDiagram';
import { ArrowIcon, CloseIcon, SparkIcon } from './icons';
import { WebGLGate } from './WebGLGate';

export type LibraryCollection = 'molecules' | 'ions';

export function LibraryView() {
  const routeParams = useAppStore((state) => state.params);
  const setView = useAppStore((state) => state.setView);
  const navigate = useAppStore((state) => state.navigate);
  const mergeParams = useAppStore((state) => state.mergeParams);
  const collection: LibraryCollection =
    routeParams.collection === 'ions' ? 'ions' : 'molecules';
  const category =
    collection === 'molecules' &&
    typeof routeParams.category === 'string' &&
    (MOLECULE_CATEGORIES as readonly string[]).includes(routeParams.category)
      ? routeParams.category
      : '전체';
  const dialogId =
    typeof routeParams.molecule === 'string' &&
    MOLECULES.some((molecule) => molecule.id === routeParams.molecule)
      ? routeParams.molecule
      : null;
  const [ionGroup, setIonGroup] = useState('전체');
  const setReaction = useReactionStore((state) => state.setReaction);
  const loadMolecule = useBuildStore((state) => state.loadMolecule);
  const filtered = useMemo(
    () =>
      category === '전체'
        ? MOLECULES
        : MOLECULES.filter((molecule) => molecule.category === category),
    [category],
  );
  const filteredIons = useMemo(
    () =>
      ionGroup === '전체'
        ? IONS
        : IONS.filter((ion) => ionKindKo(ion.kind) === ionGroup),
    [ionGroup],
  );
  const dialogMolecule = dialogId ? getMolecule(dialogId) : null;

  const closeDialog = useCallback(() => mergeParams({ molecule: '' }), [mergeParams]);
  const selectCollection = useCallback(
    (next: LibraryCollection) => {
      mergeParams({ collection: next === 'molecules' ? '' : next, category: '', molecule: '' });
    },
    [mergeParams],
  );
  const selectCategory = useCallback(
    (next: string) => {
      mergeParams({ category: next === '전체' ? '' : next });
    },
    [mergeParams],
  );
  const openDialog = useCallback(
    (id: string) => {
      mergeParams({ molecule: id });
    },
    [mergeParams],
  );
  const startBuilding = useCallback(
    (molecule: MoleculeData, mode: 'complete' | 'target') => {
      loadMolecule(molecule.id, mode);
      setView('build');
    },
    [loadMolecule, setView],
  );
  const openWorksheet = useCallback(
    (molecule: MoleculeData) => {
      navigate('worksheet', { molecule: molecule.id });
    },
    [navigate],
  );
  const openReaction = useCallback(
    (reactionId: string) => {
      setReaction(reactionId);
      navigate('reactions', { id: reactionId });
    },
    [setReaction, navigate],
  );

  return (
    <section className="view library-view" aria-labelledby="library-title">
      <div className="view-heading">
        <div className="view-heading-copy">
          <span className="view-kicker">분자 도감</span>
          <h2 id="library-title">
            {collection === 'molecules' ? '12개의 분자 표본을 만나 보세요' : '반응의 주인공 이온 도감'}
          </h2>
          <p>
            {collection === 'molecules'
              ? '생명과 환경, 연소와 기체, 산과 염기, 유기 화학을 대표하는 분자입니다. 구조를 살펴보고 같은 모형을 실험대에서 직접 조립해 보세요.'
              : '반응 극장에 등장하는 이온들입니다. 전하와 용해도, 관련 반응을 확인하고 극장 장면으로 바로 이동해 보세요.'}
          </p>
        </div>
        <div className="library-summary">
          <SparkIcon />
          <div>
            <strong>
              {collection === 'molecules' ? `${MOLECULES.length}종` : `${IONS.length}종`}
            </strong>
            <span>3D 구조 · 한글 해설</span>
          </div>
        </div>
      </div>

      <div className="filter-bar" role="group" aria-label="도감 종류">
        {(
          [
            { id: 'molecules', label: '분자' },
            { id: 'ions', label: '이온' },
          ] as { id: LibraryCollection; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`filter-chip${collection === item.id ? ' is-active' : ''}`}
            aria-pressed={collection === item.id}
            onClick={() => selectCollection(item.id)}
          >
            {item.label}
            <span>{item.id === 'molecules' ? MOLECULES.length : IONS.length}</span>
          </button>
        ))}
      </div>

      {collection === 'ions' ? (
        <>
          <div className="filter-bar" role="group" aria-label="이온 분류">
            {ION_GROUPS.map((value) => {
              const count =
                value === '전체'
                  ? IONS.length
                  : IONS.filter((ion) => ionKindKo(ion.kind) === value).length;
              return (
                <button
                  key={value}
                  type="button"
                  className={`filter-chip${ionGroup === value ? ' is-active' : ''}`}
                  aria-pressed={ionGroup === value}
                  onClick={() => setIonGroup(value)}
                >
                  {value}
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="specimen-grid">
            {filteredIons.map((ion, index) => (
              <article
                key={ion.id}
                className="specimen-card"
                style={
                  {
                    '--specimen-accent': ion.color,
                    '--card-index': index,
                  } as CSSProperties
                }
                data-testid={`ion-${ion.id}`}
              >
                <div className="specimen-head">
                  <span className="specimen-number">
                    {ionKindKo(ion.kind)} · 전하 {ion.charge > 0 ? `+${ion.charge}` : ion.charge}
                  </span>
                  <span className="specimen-category">이온</span>
                </div>
                <div className="specimen-body">
                  <div className="specimen-title">
                    <h3>
                      {ion.nameKo}
                      <span>{ion.nameEn}</span>
                    </h3>
                    <strong aria-label={ion.formula}>{ion.formula}</strong>
                  </div>
                  <p className="specimen-description">{ion.descriptionKo}</p>
                  <p className="specimen-description">용해도: {ion.solubilityKo}</p>
                </div>
                <div className="specimen-actions">
                  {ion.reactionIds.map((reactionId) => (
                    <button
                      key={reactionId}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => openReaction(reactionId)}
                    >
                      {getReaction(reactionId).titleKo} 보기
                    </button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
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
              onClick={() => selectCategory(value)}
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
                  onClick={() => openDialog(molecule.id)}
                >
                  자세히
                  <ArrowIcon />
                </button>
              </div>
            </article>
          );
        })}
      </div>

        </>
      )}

      {dialogMolecule ? (
        <MoleculeDialog
          molecule={dialogMolecule}
          onClose={closeDialog}
          onStart={startBuilding}
          onWorksheet={openWorksheet}
        />
      ) : null}
    </section>
  );
}

interface MoleculeDialogProps {
  molecule: MoleculeData;
  onClose: () => void;
  onStart: (molecule: MoleculeData, mode: 'complete' | 'target') => void;
  onWorksheet: (molecule: MoleculeData) => void;
}

function MoleculeDialog({ molecule, onClose, onStart, onWorksheet }: MoleculeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const safeMode = useAppStore((state) => state.params.safe) === '1';

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
            <WebGLGate
              label={`${molecule.nameKo} 분자 3D 구조`}
              summary={`${molecule.nameKo}(${molecule.formula}) 3D 구조 미리보기입니다.`}
              forceFallback={safeMode}
            >
              <PreviewScene
                molecule={molecule}
                autoRotate
                showLabels
                ariaLabel={`${molecule.nameKo} 분자 3D 구조`}
              />
            </WebGLGate>
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
              <button type="button" className="btn btn-ghost" onClick={() => onWorksheet(molecule)}>
                학습지 인쇄
              </button>
            </div>
            <p className="dialog-caveat">결합각과 크기는 학습을 위해 단순화한 대표값입니다.</p>
          </div>
        </div>
      </div>
    </dialog>
  );
}
