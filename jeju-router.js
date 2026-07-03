/**
 * jeju-router.js — jeju.hondi.net 전용 내부 라우터
 *
 * gwp-registry.js의 다른 서비스(K-Law 등)는 sp_key 하나 → 고정 SP 파일
 * 하나를 로드하지만, 제주 행정 도메인은 JEJU-GOV-COMMON §6에서 정의한
 * [JEJU_CHAIN: SP-DO-000 > L2 > L3? > L4?] 문법에 따라 요청마다 다른
 * 조합의 SP를 동적으로 조립해야 한다. 이 파일이 그 조립을 담당한다.
 *
 * 캐싱 전략(JEJU-GOV-COMMON §7)에 따라 JEJU-GOV-COMMON + JEJU-DO-SP는
 * 항상 고정 접두사로 유지하고, 그 뒤에만 매 요청마다 가변 SP를 붙인다.
 */

const _RAW = 'https://raw.githubusercontent.com/Openhash-Gopang/gopang/main/prompts/Jejudo/';

// ── 고정 접두사 캐시 ─────────────────────────────────────────
let _fixedPrefix = null;

async function _fetchText(path) {
  const r = await fetch(_RAW + path + '?t=' + Math.floor(Date.now() / 3600000)); // 1시간 캐시 버스팅
  if (!r.ok) throw new Error(`fetch 실패: ${path} (${r.status})`);
  return r.text();
}

async function _loadFixedPrefix() {
  if (_fixedPrefix) return _fixedPrefix;
  const [common, doSp] = await Promise.all([
    _fetchText('00-common/JEJU-GOV-COMMON_v1.0.md'),
    _fetchText('01-do/JEJU-DO-SP_v1.0.md'),
  ]);
  _fixedPrefix = common + '\n\n---\n\n' + doSp;
  return _fixedPrefix;
}

// ── L2 라우팅 테이블 (JEJU-DO-SP §3-1/§3-2/§3-3과 동기화) ─────
// 각 항목: 코드, 파일 경로, 매칭 키워드. 여러 항목이 매칭되면 키워드
// 개수가 가장 많이 일치하는 쪽을 우선한다(단순 스코어링 — v1.1에서
// LLM 기반 분류로 고도화 검토).
const L2_TABLE = [
  { code: 'SP-DO-PLAN',     file: '02-do-dept/SP-DO-PLAN_v1.0.md',
    kw: ['기획조정실', '고향사랑기부', '세정', '지방세', '취득세', '재산세', '청년정책', '인구정책', '예산', '기획'] },
  { code: 'SP-DO-SAFETY',   file: '02-do-dept/SP-DO-SAFETY_v1.0.md',
    kw: ['안전건강실', '재난', '태풍', '호우', '보건정책', '감염병', '예방접종', '응급의료', '안전', '재난', '보건'] },
  { code: 'SP-DO-JACHI',    file: '02-do-dept/SP-DO-JACHI_v1.0.md',
    kw: ['특별자치행정국', '특별자치', '자치분권', '제주특별법'] },
  { code: 'SP-DO-ECON',     file: '02-do-dept/SP-DO-ECON_v1.0.md',
    kw: ['경제활력국', '소상공인', '자영업', '중소기업', '일자리', '정책자금', '경제'] },
  { code: 'SP-DO-INNOV',    file: '02-do-dept/SP-DO-INNOV_v1.0.md',
    kw: ['혁신산업국', '신재생', '풍력', '태양광', '디지털', 'AI산업', '스타트업', '산업'] },
  { code: 'SP-DO-WELFARE',  file: '02-do-dept/SP-DO-WELFARE_v1.0.md',
    kw: ['복지가족국', '보건복지여성국', '기초생활수급', '기초연금', '보육료', '어린이집', '장애인복지', '한부모',
         '복지', '임신', '출산', '육아', '보육', '장애인', '여성가족'] },
  { code: 'SP-DO-CLIMATE',  file: '02-do-dept/SP-DO-CLIMATE_v1.0.md',
    kw: ['기후환경국', '전기차', '탄소중립', '환경영향평가', '클린하우스', '분리배출', '폐기물', '환경'] },
  { code: 'SP-DO-HOUSING',  file: '02-do-dept/SP-DO-HOUSING_v1.0.md',
    kw: ['건설주택국', '공공임대주택', '건축허가', '건축인허가', '주택', '건축'] },
  { code: 'SP-DO-TRANSPORT',file: '02-do-dept/SP-DO-TRANSPORT_v1.0.md',
    kw: ['교통항공국', '버스', '준공영제', '교통약자', '콜택시', '공영주차장', '공항', '제2공항', '교통'] },
  { code: 'SP-DO-CULTURE',  file: '02-do-dept/SP-DO-CULTURE_v1.0.md',
    kw: ['문화체육교육국', '생활체육', '평생교육', '평생학습', '문화예술', '체육', '도서관', '문화'] },
  { code: 'SP-DO-TOURISM',  file: '02-do-dept/SP-DO-TOURISM_v1.0.md',
    kw: ['관광교류국', '관광지', '숙박업', '게스트하우스', '여행업', '국제교류', '관광'] },
  { code: 'SP-DO-AGRI',     file: '02-do-dept/SP-DO-AGRI_v1.0.md',
    kw: ['농축산식품국', '농업경영체', '공익직불금', '농산물재해보험', '축산', '농업', '농사'] },
  { code: 'SP-DO-OCEAN',    file: '02-do-dept/SP-DO-OCEAN_v1.0.md',
    kw: ['해양수산국', '어업면허', '마을어장', '수산업', '양식업', '어업', '수산'] },
];

const CITY_TABLE = [
  { code: 'SP-CITY-JEJU',      file: '04-city/jeju/SP-CITY-JEJU_v1.0.md',
    kw: ['제주시', '제주시청'] },
  { code: 'SP-CITY-SEOGWIPO',  file: '04-city/seogwipo/SP-CITY-SEOGWIPO_v1.0.md',
    kw: ['서귀포시', '서귀포시청'] },
];

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
  const prefix = await _loadFixedPrefix();
  const text = userText || '';
  const trace = ['JEJU-GOV-COMMON', 'SP-DO-000'];
  const parts = [prefix];

  // 1) 읍면동/리 이름이 직접 언급되면 규칙 B/C/F: 행정시 → 읍면동 체인
  const emdRecords = await _loadEmdRecords();
  let emdMatch = _matchEmd(text, emdRecords)
    || (pdvLocationHint ? _matchEmd(pdvLocationHint, emdRecords) : null);

  if (emdMatch) {
    const cityCode = emdMatch.행정시명 === '제주시' ? CITY_TABLE[0] : CITY_TABLE[1];
    const cityText = await _fetchText(cityCode.file);
    parts.push(cityText);
    trace.push(cityCode.code);

    // 서귀포시 + 상하수도 키워드 → 규칙 F: 읍면동 생략, 시청 직행
    const isWaterQuery = /상수도|수돗물|누수|수질|정수/.test(text);
    if (cityCode.code === 'SP-CITY-SEOGWIPO' && isWaterQuery) {
      trace.push('(규칙 F: 서귀포 상하수도는 읍면동 생략)');
    } else {
      const emdTemplate = await _fetchText('05-emd/SP-EMD-TEMPLATE_v1.0.md');
      parts.push(_renderEmdTemplate(emdTemplate, emdMatch));
      trace.push(`SP-EMD-${emdMatch.읍면동명}`);
    }

    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }

  // 2) 행정시만 언급(읍면동 특정 안 됨) → 시청 레이어만
  const cityOnly = _matchCity(text);
  if (cityOnly) {
    const cityText = await _fetchText(cityOnly.file);
    parts.push(cityText);
    trace.push(cityOnly.code);
    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }

  // 3) 실국 키워드 매칭 → 규칙 A: 짧은 체인
  const divMatch = _scoreMatch(text, L2_TABLE);
  if (divMatch) {
    const divText = await _fetchText(divMatch.file);
    parts.push(divText);
    trace.push(divMatch.code);
    return { systemPrompt: parts.join('\n\n---\n\n'), trace };
  }

  // 4) 아무 것도 안 걸리면 도청 공통 레이어만(§2: 개요·안내 수준으로 직접 답)
  trace.push('(L2 미매칭 — 공통 레이어가 일반 안내만 제공)');
  return { systemPrompt: parts.join('\n\n---\n\n'), trace };
}

window.assembleJejuSystemPrompt = assembleJejuSystemPrompt;
