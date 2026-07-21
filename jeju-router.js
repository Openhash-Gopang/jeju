/**
 * jeju-router.js — jeju.hondi.net 전국 지방행정 진입점 (2026-07-21, 전국 중심 전환)
 *
 * 주피터 지시(2026-07-21): "제주도는 테스트 용도였으며, 테스트가
 * 끝났으므로 jeju 중심 아키텍처를 전국 중심으로 전환해야 한다." —
 * window.HONDI_PROVINCE_CODE='jeju' 고정을 제거한다. 이제 gov-router.js의
 * `_resolveProvinceCode()`가 (1) 이 오버라이드가 없으므로 (2) 사용자
 * 발화·PDV 위치 힌트 기반 동적 판별(PROVINCE_REGISTRY, 2026-07-21)로
 * 넘어간다 — 이 배포가 곧 "전국" 진입점이 된다. 제주 사용자는 "제주"·
 * "홍천군"처럼 지역이 언급되거나 PDV에 거주지가 저장돼 있으면 여전히
 * 정확히 판별되고, 판별 실패 시에도 조용히 다른 도로 오판정되지 않고
 * "지역을 알려달라"는 정직한 안내로 처리된다.
 *
 * 실제 라우팅 로직(조립·매칭·캐싱 전부)은 gopang(중앙 저장소)의
 * `src/gopang/gov/gov-router.js`에 있다 — 이 파일은 그 중앙 모듈을
 * 크로스오리진으로 가져와 재수출(re-export)하는 얇은 진입점 셋업일
 * 뿐이다. `gwp-report-client.js`가 이미 15개 K-서비스에 쓰고 있는
 * "단일 소스 + 크로스오리진 import" 패턴과 동일하다(auth/subsystem-auth.js도
 * 같은 관행).
 *
 * 원래 이 파일이 갖고 있던 ~1000줄의 조립·매칭 로직, JEJU_L2_TABLE 등
 * 라우팅 데이터, PROVINCE_TABLES 레지스트리는 전부 gov-router.js로
 * 이전됐다 — 히스토리는 git log(이 저장소의 과거 커밋)와 gopang
 * 저장소의 gov-router.js 커밋 로그 양쪽에서 추적 가능하다.
 *
 * 도별 전용 배포(예: gyeonggi.hondi.net)를 별도로 두고 싶다면 이 파일을
 * 복제해 `window.HONDI_PROVINCE_CODE = '<도코드>'` 한 줄만 다시 추가하면
 * 된다 — 그 오버라이드 우선순위는 gov-router.js에 그대로 남아있다.
 */

export * from 'https://hondi.net/src/gopang/gov/gov-router.js';
