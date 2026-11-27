// PIN 저장·비교 (B-6 S4)
// - 해시: Node 내장 scrypt (설치할 것 없음). 저장 형식 "scrypt$N$r$p$소금$해시" (base64)
// - 전환 기간: 저장된 값이 해시가 아니면 평문으로 비교한다. 운영·베타가 같은 DB를 쓰는 동안(사전 결정 10) 옛 서버가
//   평문으로 비교하므로 PIN을 평문으로 두고, 운영 전환(B-14) 때 해시 저장을 켠 뒤 기존 PIN을 바꾼다 (scripts/hash-pins.ts)
// - 비교는 걸리는 시간으로 값을 짐작하지 못하게 timingSafeEqual
// 참고: 4자리 PIN은 1만 개뿐이라, DB가 통째로 새면 해시도 시간을 들이면 풀린다. 해시는 DB 화면·백업에서 PIN이 그대로
// 보이지 않게 하는 정도이고, 진짜 보호는 서버의 시도 횟수 제한(B-5 S2)이다
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const PREFIX = 'scrypt';
const KEY_LENGTH = 32;
const PARAMS = { N: 16384, r: 8, p: 1 };

function derive(pin: string, salt: Buffer, options: ScryptOptions) {
    return new Promise<Buffer>((resolve, reject) => {
        scrypt(pin, salt, KEY_LENGTH, options, (error, key) =>
            error ? reject(error) : resolve(key),
        );
    });
}

function safeEqual(a: Buffer, b: Buffer) {
    return a.length === b.length && timingSafeEqual(a, b);
}

/** 저장할 해시를 만든다 */
export async function hashPin(pin: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(pin, salt, PARAMS);
    const { N, r, p } = PARAMS;
    return [PREFIX, N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
}

/** 저장된 값이 해시인지 (아니면 전환 전의 평문) */
export const isHashedPin = (stored: string) => stored.startsWith(`${PREFIX}$`);

/**
 * 넣은 PIN이 저장된 값(해시 또는 평문)과 맞는지. 문자열이 아니면 틀림
 * (api.js와 같다: 숫자 1234는 문자열 "1234"와 다르다)
 */
export async function verifyPin(pin: unknown, stored: string | null | undefined): Promise<boolean> {
    if (typeof pin !== 'string' || !stored) return false;
    if (!isHashedPin(stored)) return safeEqual(Buffer.from(pin), Buffer.from(stored));

    const [, n, r, p, salt, key] = stored.split('$');
    if (!n || !r || !p || !salt || !key) return false;
    const expected = Buffer.from(key, 'base64');
    const actual = await derive(pin, Buffer.from(salt, 'base64'), {
        N: Number(n),
        r: Number(r),
        p: Number(p),
    });
    return safeEqual(actual, expected);
}
