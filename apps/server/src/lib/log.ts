// 활동 로그 파일 (한 줄 형식: 방문자id_시각_동작). B-7에서 DB 활동 기록으로 바뀐다
// 현재 동작: 줄마다 파일 전체를 읽고 다시 쓴다. 동시에 쓰면 줄이 사라질 수 있다 (O1).
// 파일이 없으면 만들지 않는다. 5만 줄이 차면 맨 앞 줄을 지운다
import fs from 'node:fs';
import { getTime } from './time.ts';

const MAX_LINES = 50000;

/** "방문자id_시각_동작" 한 줄을 로그 파일에 붙인다 */
export type Logger = (visitorId: string, action: string) => void;

/** 로그 파일에 한 줄을 붙이는 함수를 만든다. 쓰기는 응답과 관계없이 뒤에서 끝난다 */
export function createLogger(filePath: string): Logger {
    function appendLog(contentToAdd: string) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                console.error('파일을 읽을 수 없습니다:', err);
                return;
            }

            const lines = data.split('\n');

            if (lines.length >= MAX_LINES) {
                lines.shift();
            }

            lines.push(contentToAdd);

            fs.writeFile(filePath, lines.join('\n'), (err) => {
                if (err) {
                    console.error('파일에 쓰기 실패:', err);
                }
            });
        });
    }

    return (visitorId, action) => appendLog(`${visitorId}_${getTime()}_${action}`);
}
