// 입력 길이 제한: 웹의 입력칸(maxLength·글자 수 표시)과 서버의 요청 검증이 같은 값을 쓴다 (백엔드 개편 B-8, 사용자 결정)
// 웹 입력칸만 막으면 API를 직접 부를 때 제한이 없으므로 서버도 같은 값으로 검사한다.
// 바꾸면 웹·서버가 함께 바뀐다. 이미 저장된 데이터는 다시 검사하지 않는다 (목록 응답은 그대로 보낸다)

/** 팀명 */
export const TEAM_NAME_MAX = 20;
/** 팀원 칸 하나 (보컬·기타·베이스·드럼·키보드·매니저) */
export const TEAM_MEMBER_MAX = 12;
/** 셋리스트 및 팀 정보 */
export const SETLIST_MAX = 200;
/** 날적이 글 하나 */
export const NOTE_TEXT_MAX = 200;
// 공지는 길이 제한이 없다 (웹에도 없음, 마스터 PIN으로만 올린다). 요청 본문 전체는 express.json 기본값 100kB까지
