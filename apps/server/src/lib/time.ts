// 날짜 계산의 기준 시간대: 한국 (백엔드 개편 B-8 D1)
// 서버 컴퓨터의 시간대 설정(보통 UTC)에 기대지 않는다. 같은 코드가 내 PC(KST)·CI(UTC)·운영 서버 어디서든 같은 답을 낸다.
// 이전: "오늘 0시"를 서버 시간대로 계산(setHours) → 서버가 UTC면 KST 오전 9시가 "오늘 0시"라,
//       KST 오전 9시 전에 시작하는 오늘 일회성 합주가 9시부터 목록에서 빠졌다.
// 한국은 서머타임이 없어 언제나 UTC+9다 (1988년 이후). 그래서 시간대 라이브러리 없이 9시간을 더하고 빼서 계산한다.
// (컨테이너에도 TZ=Asia/Seoul을 두지만(B-11) 그건 로그 시각 등 사람이 볼 때를 위한 것이고, 계산은 이 파일만 믿는다)

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 이 시각(now)이 속한 한국 날짜의 0시 (KST 0시 = 전날 15:00Z) */
export function startOfKstDay(now: Date): Date {
    const kst = new Date(now.getTime() + KST_OFFSET_MS);
    kst.setUTCHours(0, 0, 0, 0);
    return new Date(kst.getTime() - KST_OFFSET_MS);
}

/** 이 시각의 한국 요일. 월요일 0 ~ 일요일 6 (합주의 day와 같은 기준, 웹 types/domain의 DayIndex) */
export function kstDayIndex(date: Date): number {
    const sundayFirst = new Date(date.getTime() + KST_OFFSET_MS).getUTCDay(); // 일요일 0
    return (sundayFirst + 6) % 7;
}

/** 이 시각의 한국 날짜 'YYYY-MM-DD' (팀·합주 due와 비교할 때. 같은 형식의 문자열은 글자 순서 = 날짜 순서) */
export function kstDateString(now: Date): string {
    return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * 다음에 한국 시각 hour시가 될 때까지 남은 시간(ms). 정각이 지금이면 하루 뒤 (B-9 정리 작업의 다음 실행).
 * 한국은 서머타임이 없어 하루가 늘 24시간이다
 */
export function msUntilNextKstHour(now: Date, hour: number): number {
    const today = startOfKstDay(now).getTime() + hour * 60 * 60 * 1000;
    const next = today > now.getTime() ? today : today + 24 * 60 * 60 * 1000;
    return next - now.getTime();
}
