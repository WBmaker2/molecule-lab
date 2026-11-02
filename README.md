# Molecule Lab

원자를 끌어 분자를 만들고, 결합각·극성·화학식을 확인한 뒤 상태변화와 화학반응까지 관찰하는 3D 화학 수업 도구입니다 (중2~고1).

- **정적 사이트**: 서버, 로그인, DB 없음.
- **런타임 AI 없음**: 빌드 후 LLM/API 호출 없음.
- **오프라인 지원**: PWA로 설치할 수 있습니다.

## 화면

- **조립대**: H·C·N·O·Na·Cl 원자를 놓고 결합합니다. 결합 도우미, 결합각·극성·비공유 전자쌍 오버레이, 화학식·구조 자동 판정, 실행 취소/다시 실행, 거리 측정을 제공합니다. 작업은 JSON 저장·불러오기와 공유 링크로 나눌 수 있습니다.
- **상태변화**: -20°C~120°C 슬라이더로 고체·액체·기체 입자 운동과 물 밀도·상대 부피를 비교합니다. 입자는 최대 2,000개이며 자동/고화질/저전력 화질을 고를 수 있습니다.
- **반응 극장**: 중화 반응과 염화은·황산바륨·아이오딘화납 앙금 생성 반응을 단계별로 재생합니다. 분자 반응식과 알짜 이온식을 함께 보여줍니다.
- **분자 도감**: 물, 이산화탄소, 메탄, 암모니아 등 12종의 구조와 한글 설명을 살펴봅니다. 반응 이온 11종 도감과 인쇄용 학습지도 제공합니다.
- **퀴즈**: 3D 구조를 보고 분자 이름을 맞히는 5문제 퀴즈입니다. 비슷한 구조의 오답과 최고 기록·도전 횟수를 관리합니다.

## 수업 활용

- 교사 프리셋 링크 예시: `#/build?target=co2&mode=target`, `#/states?temp=112&count=1500`, `#/reactions/precipitation?t=1`, `#/library?collection=ions`, `#/quiz?seed=7`, `#/worksheet?molecule=h2o`
- 학습지 화면에서 인쇄하기로 수업용 기록지를 뽑을 수 있습니다.
- `?safe=1`을 붙이면 3D 대신 간단 모드로 표시됩니다.

## 시작하기

```bash
npm install
npm run dev
```

주요 명령:

```bash
npm run verify      # 타입 검사, 린트, 단위 테스트, 프로덕션 빌드
npm run test:e2e    # Playwright 브라우저 테스트
npm run icons       # PWA 아이콘 다시 만들기
```

## 기술 구성

- React 19 + Vite + TypeScript
- Three.js, @react-three/fiber, @react-three/drei
- Zustand
- Tailwind CSS v4
- Vitest + Playwright

분자 데이터는 [`src/chem/molecules.json`](src/chem/molecules.json), 이온 데이터는 [`src/chem/ions.json`](src/chem/ions.json), 반응 타임라인은 [`src/chem/reactions.json`](src/chem/reactions.json)에 있습니다. 콘텐츠 묶음은 [`src/chem/content.ts`](src/chem/content.ts)의 버전과 스키마 검사로 관리합니다. 1,500개 입자는 instanced mesh로 렌더링하며, 입자 시뮬레이션 스텝은 프레임 예산 이내인지 단위 테스트로 확인합니다.

결합각과 원자 크기는 학습을 위해 단순화한 대표값입니다. 자세한 학습 설계는 [`구현계획.md`](구현계획.md), 변경 기록은 [`docs/UPDATELOG.md`](docs/UPDATELOG.md)를 참고하세요.
