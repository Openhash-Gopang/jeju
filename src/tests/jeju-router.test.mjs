// jeju-router.test.mjs — 2026-07-19 이전(migration) 안내
//
// 이 파일이 검증하던 실제 라우팅 로직은 gopang(중앙 저장소)의
// src/gopang/gov/gov-router.js로 이전됐다(jeju-router.js 자체가 이제
// 그 모듈을 재수출하는 얇은 인스턴스 셋업일 뿐이라 — 파일 자신의 헤더
// 주석 참고). 로컬 로직이 없으므로 이 저장소 안에서 검증할 대상 자체가
// 없어졌다.
//
// 실제 테스트는 gopang 저장소의 src/tests/gov-router.test.mjs로
// 옮겨졌다(fetch를 목(mock)해서 로컬 파일을 직접 import·검증 — 이
// 저장소에서 같은 방식으로 하려면 재수출 대상(https://hondi.net/...)이
// 실제 네트워크 응답이라 로컬 목이 통하지 않는다).
//
// 이 저장소에서 회귀를 확인하려면 gopang 저장소에서 다음을 실행:
//   node src/tests/gov-router.test.mjs
//
// (파일을 완전히 삭제하지 않고 이 안내로 남겨두는 이유: 과거 이
// 경로를 참조했을 수 있는 CI 설정·문서가 "파일이 갑자기 사라짐"이
// 아니라 "왜 없어졌는지" 알 수 있게 하기 위함)
process.exit(0);
