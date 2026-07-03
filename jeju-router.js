/**
 * jeju-router.js — jeju.hondi.net 전용 내부 라우터
 *
 * gwp-registry.js의 다른 서비스(K-Law 등)는 sp_key 하나 → 고정 SP 파일
 * 하나를 로드하지만, 제주 행정 도메인은 JEJU-GOV-COMMON §6에서 정의한
 * [JEJU_CHAIN: SP-DO-000 > L2 > L3? > L4?] 문법에 따라 요청마다 다른
 * 조합의 SP를 동적으로 조립해야 한다. 이 파일이 그 조립을 담당한다.
 *
 * v1.1: JEJU-NATIONAL-SP(국가기관 트리) 추가 — JEJU-DO-SP(도청 트리)와
 * JEJU-GOV-COMMON 바로 아래의 형제 노드다(JEJU-NATIONAL-SP §0). 그래서
 * "고정 접두사"는 JEJU-GOV-COMMON까지만이고, 그 다음 DO-SP냐 NATIONAL-SP냐는
 * 매 요청마다 배타적으로 갈린다 — 두 트리를 동시에 체인하지 않는다.
 */

const _RAW = 'https://raw.githubusercontent.com/Openhash-Gopang/gopang/main/prompts/Jejudo/';

// ── 고정 접두사(GOV-COMMON) + 배타적 L1 노드(DO-SP/NATIONAL-SP) 캐시 ──
let _govCommon = null;
let _doSpCache = null;
let _nationalSpCache = null;

async function _fetchText(path) {
  const r = await fetch(_RAW + path + '?t=' + Math.floor(Date.now() / 3600000)); // 1시간 캐시 버스팅
  if (!r.ok) throw new Error(`fetch 실패: ${path} (${r.status})`);
  return r.text();
}

async function _loadGovCommon() {
  if (!_govCommon) _govCommon = await _fetchText('00-common/JEJU-GOV-COMMON_v1_2.md');
  return _govCommon;
}
async function _loadDoSp() {
  if (!_doSpCache) _doSpCache = await _fetchText('01-do/JEJU-DO-SP_v1.0.md');
  return _doSpCache;
}
async function _loadNationalSp() {
  if (!_nationalSpCache) _nationalSpCache = await _fetchText('09-national/JEJU-NATIONAL-SP_v1.0.md');
  return _nationalSpCache;
}

// ── L2 라우팅 테이블 (JEJU-DO-SP §3-1/§3-2/§3-3과 동기화) ─────
// 각 항목: 코드, 파일 경로, 매칭 키워드. 여러 항목이 매칭되면 키워드
// 개수가 가장 많이 일치하는 쪽을 우선한다(단순 스코어링 — v1.1에서
// LLM 기반 분류로 고도화 검토).
const L2_TABLE = [
  { code: 'SP-DO-PLAN',     file: '02-do-dept/SP-DO-PLAN_v1.1.md',
    kw: ['기획조정실', '고향사랑기부', '세정', '지방세', '취득세', '재산세', '청년정책', '인구정책', '예산', '기획'] },
  { code: 'SP-DO-SAFETY',   file: '02-do-dept/SP-DO-SAFETY_v1.1.md',
    kw: ['안전건강실', '재난', '태풍', '호우', '보건정책', '감염병', '예방접종', '응급의료', '안전', '재난', '보건'] },
  { code: 'SP-DO-JACHI',    file: '02-do-dept/SP-DO-JACHI_v1.1.md',
    kw: ['특별자치행정국', '특별자치', '자치분권', '제주특별법'] },
  { code: 'SP-DO-ECON',     file: '02-do-dept/SP-DO-ECON_v1.1.md',
    kw: ['경제활력국', '소상공인', '자영업', '중소기업', '일자리', '정책자금', '경제'] },
  { code: 'SP-DO-INNOV',    file: '02-do-dept/SP-DO-INNOV_v1.1.md',
    kw: ['혁신산업국', '신재생', '풍력', '태양광', '디지털', 'AI산업', '스타트업', '산업'] },
  { code: 'SP-DO-WELFARE',  file: '02-do-dept/SP-DO-WELFARE_v1.1.md',
    kw: ['복지가족국', '보건복지여성국', '기초생활수급', '기초연금', '보육료', '어린이집', '장애인복지', '한부모',
         '복지', '임신', '출산', '육아', '보육', '장애인', '여성가족'] },
  { code: 'SP-DO-CLIMATE',  file: '02-do-dept/SP-DO-CLIMATE_v1.1.md',
    kw: ['기후환경국', '전기차', '탄소중립', '환경영향평가', '클린하우스', '분리배출', '폐기물', '환경'] },
  { code: 'SP-DO-HOUSING',  file: '02-do-dept/SP-DO-HOUSING_v1.1.md',
    kw: ['건설주택국', '공공임대주택', '건축허가', '건축인허가', '주택', '건축'] },
  { code: 'SP-DO-TRANSPORT',file: '02-do-dept/SP-DO-TRANSPORT_v1.1.md',
    kw: ['교통항공국', '버스', '준공영제', '교통약자', '콜택시', '공영주차장', '공항', '제2공항', '교통'] },
  { code: 'SP-DO-CULTURE',  file: '02-do-dept/SP-DO-CULTURE_v1.1.md',
    kw: ['문화체육교육국', '생활체육', '평생교육', '평생학습', '문화예술', '체육', '도서관', '문화'] },
  { code: 'SP-DO-TOURISM',  file: '02-do-dept/SP-DO-TOURISM_v1.1.md',
    kw: ['관광교류국', '관광지', '숙박업', '게스트하우스', '여행업', '국제교류', '관광'] },
  { code: 'SP-DO-AGRI',     file: '02-do-dept/SP-DO-AGRI_v1.1.md',
    kw: ['농축산식품국', '농업경영체', '공익직불금', '농산물재해보험', '축산', '농업', '농사'] },
  { code: 'SP-DO-OCEAN',    file: '02-do-dept/SP-DO-OCEAN_v1.1.md',
    kw: ['해양수산국', '어업면허', '마을어장', '수산업', '양식업', '어업', '수산'] },
];

const CITY_TABLE = [
  { code: 'SP-CITY-JEJU',      file: '04-city/jeju/SP-CITY-JEJU_v1.1.md',
    kw: ['제주시', '제주시청'] },
  { code: 'SP-CITY-SEOGWIPO',  file: '04-city/seogwipo/SP-CITY-SEOGWIPO_v1.1.md',
    kw: ['서귀포시', '서귀포시청'] },
];

// ── 국가기관 라우팅 테이블 (JEJU-NATIONAL-SP §3-1, 1차 배치 8개) ───
// 도청 트리(JEJU-DO-SP)와 형제 관계 — 매칭되면 DO-SP 대신 이쪽으로 간다.
// 지방세(도청)와 국세(세무서) 혼동 방지를 위해 '세금' 같은 범용어는 넣지
// 않고, 국가기관임이 분명한 고유명사만 트리거로 쓴다.
const NATIONAL_TABLE = [
  { code: 'SP-NAT-TAX',          file: '09-national/agencies/SP-NAT-TAX_v1.1.md',
    kw: ['세무서', '국세', '종합소득세', '부가가치세', '법인세', '홈택스'] },
  { code: 'SP-NAT-COURT',        file: '09-national/agencies/SP-NAT-COURT_v1.1.md',
    kw: ['지방법원', '등기소', '나의사건검색', '전자소송', '등기부등본'] },
  { code: 'SP-NAT-NPS',          file: '09-national/agencies/SP-NAT-NPS_v1.1.md',
    kw: ['국민연금'] },
  { code: 'SP-NAT-NHIS',         file: '09-national/agencies/SP-NAT-NHIS_v1.1.md',
    kw: ['건강보험공단', '건강보험료', '건강검진'] },
  { code: 'SP-NAT-IMMIGRATION',  file: '09-national/agencies/SP-NAT-IMMIGRATION_v1.1.md',
    kw: ['출입국', '외국인청', '체류자격', '비자', '귀화', '하이코리아'] },
  { code: 'SP-NAT-POST',         file: '09-national/agencies/SP-NAT-POST_v1.1.md',
    kw: ['우체국', '우정청', '등기우편', '우편'] },
  { code: 'SP-NAT-POLICE',       file: '09-national/agencies/SP-NAT-POLICE_v1.1.md',
    kw: ['지방경찰청', '국가경찰', '112', '고소장', '수사'] },
  { code: 'SP-NAT-LABOR',        file: '09-national/agencies/SP-NAT-LABOR_v1.1.md',
    kw: ['근로복지공단', '산재보험', '산업재해'] },
];

// ── 카탈로그 등록만 되고 개별 SP는 아직 없는 국가기관 (§4 공통 폴백) ──
// jeju-national-agency-catalog.md §A/§B 기준. 매칭되면 JEJU-NATIONAL-SP §4
// 형식으로 즉석 안내하고, 지어내지 않는다(간단한 카탈로그 수준 정보만).
const CATALOG_ONLY = [
  { kw: ['검찰청'], name: '제주지방검찰청', ministry: '법무부(대검찰청)', brief: '공소 제기, 수사 지휘' },
  { kw: ['해양경찰'], name: '제주해양경찰서', ministry: '해양경찰청', brief: '해상 치안, 해양사고 구조(122)' },
  { kw: ['기상청', '기상특보'], name: '제주지방기상청', ministry: '기상청', brief: '기상특보·예보' },
  { kw: ['조달청'], name: '제주지방조달청', ministry: '조달청', brief: '공공기관 물품·시설공사 조달' },
  { kw: ['병무청', '징병검사', '입영'], name: '제주지방병무청', ministry: '병무청', brief: '징병검사·입영·병역판정' },
  { kw: ['보훈청', '국가유공자'], name: '제주보훈청', ministry: '국가보훈부', brief: '국가유공자 등록·보훈급여' },
  { kw: ['노동위원회', '부당해고'], name: '제주지방노동위원회', ministry: '고용노동부', brief: '노동쟁의 조정, 부당해고 구제신청' },
  { kw: ['보호관찰', '준법지원센터'], name: '제주준법지원센터', ministry: '법무부', brief: '보호관찰, 사회봉사·수강명령 집행' },
  { kw: ['임금체불', '근로개선지도'], name: '광주지방고용노동청 제주근로개선지도센터', ministry: '고용노동부', brief: '근로기준법 위반 신고, 임금체불 진정' },
  { kw: ['검역소', '해외감염병'], name: '국립제주검역소', ministry: '질병관리청', brief: '해외 유입 감염병 검역' },
  { kw: ['농산물품질관리원', '원산지표시'], name: '국립농산물품질관리원 제주지원', ministry: '농림축산식품부', brief: '농산물 원산지 표시 단속·인증' },
  { kw: ['수산물품질관리원'], name: '국립수산물품질관리원 제주지원', ministry: '해양수산부', brief: '수산물 원산지·품질 관리' },
  { kw: ['수입식품검사'], name: '광주지방식품의약품안전청 제주수입식품검사소', ministry: '식품의약품안전처', brief: '수입식품 검사' },
  { kw: ['전파관리소', '무선국'], name: '제주전파관리소', ministry: '과학기술정보통신부', brief: '전파 혼신 조사, 무선국 검사' },
  { kw: ['공항공사', '제주국제공항 운영'], name: '한국공항공사 제주공항', ministry: '국토교통부 산하 공기업', brief: '제주국제공항 시설 운영' },
  { kw: ['해양수산청', '항만'], name: '제주지방해양수산청', ministry: '해양수산부', brief: '항만 시설·선박 등록(국가 관리 항만)' },
  { kw: ['스마트쉼센터', '인터넷과의존'], name: '한국지능정보사회진흥원 제주스마트쉼센터', ministry: '과학기술정보통신부/행정안전부', brief: '인터넷·스마트폰 과의존 상담' },
];

function _matchNational(text) {
  return _scoreMatch(text, NATIONAL_TABLE);
}
function _matchCatalogOnly(text) {
  for (const c of CATALOG_ONLY) {
    if (c.kw.some(k => text.includes(k))) return c;
  }
  return null;
}
function _renderCatalogFallback(c) {
  return `[JEJU-NATIONAL-SP §4 공통 폴백]\n` +
    `${c.name}은(는) ${c.ministry}의 제주 지역 사무소로, 아직 이 SP가 상세 안내를 갖추지 못했습니다. ` +
    `${c.brief}을(를) 담당하며, 정확한 절차는 해당 기관 홈페이지 또는 정부24(gov.kr)에서 확인하시는 것을 권장합니다.`;
}

// ── EMD 데이터 로드 (한림 + 나머지 42개 병합) ───────────────────
let _emdRecords = null;

async function _loadEmdRecords() {
  if (_emdRecords) return _emdRecords;
  const [masterRaw, hallimRaw] = await Promise.all([
    _fetchText('05-emd/emd-master-data.json'),
    _fetchText('05-emd/hallim/hallim-data.json'),
  ]);
  const master = JSON.parse(masterRaw);
  const hallim = JSON.parse(hallimRaw);
  _emdRecords = [...master.읍면동목록, hallim];
  return _emdRecords;
}

// ── 텍스트에서 읍면동 매칭 ──────────────────────────────────────
// 1) 읍면동명 직접 언급, 2) 관할리목록에 있는 리(里) 이름 언급 순으로 확인.
function _matchEmd(text, records) {
  for (const rec of records) {
    if (text.includes(rec.읍면동명)) return rec;
  }
  for (const rec of records) {
    for (const ri of rec.관할리목록 || []) {
      const riName = ri.split('(')[0].trim(); // "한림리(한림1리·...)" → "한림리"
      if (riName && text.includes(riName)) return rec;
    }
  }
  return null;
}

function _matchCity(text) {
  for (const c of CITY_TABLE) {
    if (c.kw.some(k => text.includes(k))) return c;
  }
  return null;
}

function _scoreMatch(text, table) {
  let best = null, bestScore = 0;
  for (const entry of table) {
    const score = entry.kw.filter(k => text.includes(k)).length;
    if (score > bestScore) { best = entry; bestScore = score; }
  }
  return best;
}

// ── SP-EMD-TEMPLATE 렌더링 (변수 치환) ──────────────────────────
function _renderEmdTemplate(template, rec) {
  const teamRows = (rec.팀구성 || [])
    .map(t => `| ${t.팀} | ${t.업무} |`).join('\n');
  const linkedRows = (rec.접수전용업무 || [])
    .filter(x => x)
    .map(x => `| ${x.업무영역} | ${x.실질처리주체} | ${x.연결SP || '-'} |`).join('\n');

  return template
    .replaceAll('{읍면동명}', rec.읍면동명)
    .replaceAll('{행정시명}', rec.행정시명)
    .replaceAll('{읍면동구분}', rec.읍면동구분)
    .replaceAll('{청사주소}', rec.청사주소 || 'TBD — 재검증 필요')
    .replaceAll('{대표전화}', rec.대표전화 || 'TBD — 재검증 필요')
    .replaceAll('{운영시간}', rec.운영시간 || '평일 09:00~18:00 (점심 12:00~13:00), 무인민원발급기 24시간')
    .replaceAll('{관할리목록}', (rec.관할리목록 || []).join(', '))
    .replaceAll('{주력산업}', rec.주력산업 || '')
    .replaceAll('{무인발급기위치}', rec.무인발급기위치 || 'TBD — 재검증 필요')
    .replaceAll('{특이사항}', rec.특이사항 || '')
    + (teamRows ? `\n\n### 렌더링된 팀 구성\n| 팀 | 업무 |\n|---|---|\n${teamRows}` : '')
    + (linkedRows ? `\n\n### 렌더링된 연계 업무\n| 업무영역 | 실질 처리 주체 | 연결 SP |\n|---|---|---|\n${linkedRows}` : '');
}

// ── 메인 진입점 ──────────────────────────────────────────────────
// userText: 사용자 발화(또는 GWP ctx로 넘어온 최초 요청 텍스트)
// pdvLocationHint: PDV에 저장된 거주 읍면동(있으면 우선 참조, JEJU-GOV-COMMON §2)
// 반환: { systemPrompt, trace } — trace는 디버깅/로그용 체인 경로
export async function assembleJejuSystemPrompt(userText, pdvLocationHint = null) {
  const govCommon = await _loadGovCommon();
  const text = userText || '';
  const trace = ['JEJU-GOV-COMMON'];
  const parts = [govCommon];

  // 0) 국가기관 매칭 — JEJU-DO-SP(도청 트리)와 배타적인 형제 노드.
  //    매칭되면 도청 트리는 아예 로드하지 않는다(JEJU-NATIONAL-SP §0).
  const natMatch = _matchNational(text);
  if (natMatch) {
    const nationalSp = await _loadNationalSp();
    parts.push(nationalSp);
    trace.push('JEJU-NATIONAL-SP');
    const agencyText = await _fetchText(natMatch.file);
    parts.push(agencyText);
    trace.push(natMatch.code);
    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }
  const catalogOnly = _matchCatalogOnly(text);
  if (catalogOnly) {
    const nationalSp = await _loadNationalSp();
    parts.push(nationalSp);
    parts.push(_renderCatalogFallback(catalogOnly));
    trace.push('JEJU-NATIONAL-SP', `(§4 공통 폴백: ${catalogOnly.name})`);
    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }

  // 여기부터는 도청 트리(JEJU-DO-SP) — 국가기관이 아닌 것으로 판단됐으므로 로드.
  const doSp = await _loadDoSp();
  parts.push(doSp);
  trace.push('SP-DO-000');

  // L4 업무영역 SP 매칭 — 지금은 상하수도(SP-EXP-WATER) 하나뿐.
  // JEJU-GOV-COMMON §10(정직성·데이터 연동 공백 고지 원칙)의 첫 실증 사례.
  const isWaterQuery = /상수도|수돗물|누수|수질|정수|급수|배관/.test(text);
  async function _appendExpertIfMatched() {
    if (isWaterQuery) {
      const expText = await _fetchText('06-expert/SP-EXP-WATER_v1.1.md');
      parts.push(expText);
      trace.push('SP-EXP-WATER');
    }
  }

  // 1) 읍면동/리 이름이 직접 언급되면 규칙 B/C/F: 행정시 → 읍면동 체인
  const emdRecords = await _loadEmdRecords();
  let emdMatch = _matchEmd(text, emdRecords)
    || (pdvLocationHint ? _matchEmd(pdvLocationHint, emdRecords) : null);

  if (emdMatch) {
    const cityCode = emdMatch.행정시명 === '제주시' ? CITY_TABLE[0] : CITY_TABLE[1];
    const cityText = await _fetchText(cityCode.file);
    parts.push(cityText);
    trace.push(cityCode.code);

    // 서귀포시 + 상하수도 키워드 → 규칙 F: 읍면동 생략, 시청 직행 후 바로 SP-EXP-WATER
    if (cityCode.code === 'SP-CITY-SEOGWIPO' && isWaterQuery) {
      trace.push('(규칙 F: 서귀포 상하수도는 읍면동 생략)');
    } else {
      const emdTemplate = await _fetchText('05-emd/SP-EMD-TEMPLATE_v1.1.md');
      parts.push(_renderEmdTemplate(emdTemplate, emdMatch));
      trace.push(`SP-EMD-${emdMatch.읍면동명}`);
    }
    await _appendExpertIfMatched();

    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }

  // 2) 행정시만 언급(읍면동 특정 안 됨) → 시청 레이어만
  const cityOnly = _matchCity(text);
  if (cityOnly) {
    const cityText = await _fetchText(cityOnly.file);
    parts.push(cityText);
    trace.push(cityOnly.code);
    await _appendExpertIfMatched();
    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }

  // 3) 실국 키워드 매칭 → 규칙 A: 짧은 체인
  const divMatch = _scoreMatch(text, L2_TABLE);
  if (divMatch) {
    const divText = await _fetchText(divMatch.file);
    parts.push(divText);
    trace.push(divMatch.code);
    await _appendExpertIfMatched();
    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }

  // 4) 읍면동/실국 어느 쪽도 안 걸렸지만 업무영역만 매칭된 경우(예: 지역 언급 없이 "수돗물 냄새나요")
  if (isWaterQuery) {
    await _appendExpertIfMatched();
    trace.push('(지역 미특정 — SP-EXP-WATER가 먼저 지역 확인 유도)');
    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }

  // 5) 아무 것도 안 걸리면 도청 공통 레이어만(§2: 개요·안내 수준으로 직접 답)
  trace.push('(L2 미매칭 — 공통 레이어가 일반 안내만 제공)');
  return { systemPrompt: parts.join('\n\n---\n\n'), trace };
}

window.assembleJejuSystemPrompt = assembleJejuSystemPrompt;
