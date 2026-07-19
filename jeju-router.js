/**
 * jeju-router.js — jeju.hondi.net 인스턴스 셋업 (2026-07-19, 대폭 축소)
 *
 * 주피터 지시(2026-07-19): "제주는 이제 여러 광역시도 중 하나일 뿐이며,
 * 도청·시청 등 추상 클래스를 상속받아 제주도청 인스턴스를 생성하는
 * 구조여야 한다. jeju의 역할을 중앙의 상위 클래스로 이전하라."
 *
 * 실제 라우팅 로직(조립·매칭·캐싱 전부)은 이제 gopang(중앙 저장소)의
 * `src/gopang/gov/gov-router.js`에 있다 — 이 파일은 그 중앙 모듈을
 * 크로스오리진으로 가져와 재수출(re-export)하는 얇은 인스턴스 셋업일
 * 뿐이다. `gwp-report-client.js`가 이미 15개 K-서비스에 쓰고 있는
 * "단일 소스 + 크로스오리진 import" 패턴과 동일하다(auth/subsystem-auth.js도
 * 같은 관행).
 *
 * 원래 이 파일이 갖고 있던 ~1000줄의 조립·매칭 로직, JEJU_L2_TABLE 등
 * 라우팅 데이터, PROVINCE_TABLES 레지스트리는 전부 gov-router.js로
 * 이전됐다 — 히스토리는 git log(이 저장소의 과거 커밋)와 gopang
 * 저장소의 gov-router.js 커밋 로그 양쪽에서 추적 가능하다.
 *
 * window.HONDI_PROVINCE_CODE를 명시적으로 'jeju'로 설정한다 —
 * gov-router.js의 `_resolveProvinceCode()`는 이 값이 없으면 'jeju'를
 * 기본값으로 쓰므로(하위호환) 사실 생략해도 동작은 같지만, "이 배포는
 * jeju 인스턴스다"를 암묵적 기본값이 아니라 명시적 선언으로 남기는
 * 게 인스턴스화 원칙에 맞다 — 다른 도가 이 패턴을 그대로 복제할 때
 * (예: gyeonggi.hondi.net) 이 한 줄만 고치면 되게 하기 위함이다.
 */
window.HONDI_PROVINCE_CODE = 'jeju';

export * from 'https://hondi.net/src/gopang/gov/gov-router.js';
