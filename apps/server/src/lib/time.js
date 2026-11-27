// 로그에 쓰는 시각 "YYYY.MM.DD:HH:mm" (한국 시각을 의도)
// 현재 동작: UTC에 9시간을 더한 뒤 서버 시간대로 읽는다. 서버 시간대가 UTC일 때만 한국 시각이다 (D1, B-5)
export function getTime() {
    const now = new Date();
    const kstOffset = 9 * 60; // 9 hours in minutes
    const kstTime = new Date(now.getTime() + kstOffset * 60000);
    const year = kstTime.getFullYear();
    const month = String(kstTime.getMonth() + 1).padStart(2, '0');
    const day = String(kstTime.getDate()).padStart(2, '0');
    const hour = String(kstTime.getHours()).padStart(2, '0');
    const minute = String(kstTime.getMinutes()).padStart(2, '0');

    return `${year}.${month}.${day}:${hour}:${minute}`;
}
