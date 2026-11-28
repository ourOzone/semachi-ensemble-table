// PIN 확인 규칙 한곳 (B-6): 마스터 PIN, 팀·날적이 PIN, 새 PIN 저장
// - 마스터 PIN: DB(settings의 masterPin, 관리자가 바꾼 것)가 있으면 그것, 없으면 환경변수 MASTER_PIN
//   서버 여러 대(운영·베타)가 같은 DB를 보므로, 한쪽에서 바꾸면 다른 쪽도 바로 따른다 (매번 DB에서 읽음)
// - 마스터 PIN은 어느 팀·날적이 PIN 자리에서든 통과한다 (api.js와 같음)
import type { PinKind } from '../models/activity.ts';
import { Setting } from '../models/setting.ts';
import { hashPin, verifyPin } from './pin.ts';

const MASTER_PIN_KEY = 'masterPin';

/** 새 마스터 PIN 형식: 웹의 PIN 칸이 숫자 4자리라 */
export const MASTER_PIN_FORMAT = /^\d{4}$/;

export interface PinAuth {
    /** 마스터 PIN인지 */
    isMaster(pin: unknown): Promise<boolean>;
    /** 마스터 PIN이거나 저장된 PIN(해시·평문)과 맞는지 */
    matches(pin: unknown, stored: string | null | undefined): Promise<boolean>;
    /** 어떤 PIN으로 맞았는지 (활동 기록용: 마스터·그 대상의 PIN). 틀리면 null */
    which(pin: unknown, stored: string | null | undefined): Promise<PinKind | null>;
    /** 새로 저장할 PIN 값. 해시 저장을 켰으면 해시, 아니면 받은 그대로 (전환 기간: 옛 서버가 평문으로 비교) */
    forStorage(pin: unknown): Promise<unknown>;
    /** 마스터 PIN을 바꾼다 (DB에 해시로) */
    changeMaster(newPin: string): Promise<void>;
    /** 지금 마스터 PIN이 어디서 오는지 (관리자 화면 표시용) */
    masterSource(): Promise<'db' | 'env'>;
}

export function createPinAuth({
    envMasterPin,
    hashNewPins,
}: {
    envMasterPin: string;
    hashNewPins: boolean;
}): PinAuth {
    const savedMaster = async () => (await Setting.findById(MASTER_PIN_KEY).lean())?.value ?? null;

    async function isMaster(pin: unknown) {
        return verifyPin(pin, (await savedMaster()) ?? envMasterPin);
    }

    return {
        isMaster,
        async matches(pin, stored) {
            return (await isMaster(pin)) || verifyPin(pin, stored);
        },
        async which(pin, stored) {
            if (await isMaster(pin)) return 'master';
            return (await verifyPin(pin, stored)) ? 'own' : null;
        },
        async forStorage(pin) {
            // 숫자로 와도 문자열로 저장 (api.js 때 Mongoose가 하던 것과 같음)
            if (pin === undefined || pin === null || !hashNewPins) return pin;
            return hashPin(String(pin));
        },
        async changeMaster(newPin) {
            await Setting.findByIdAndUpdate(
                MASTER_PIN_KEY,
                { value: await hashPin(newPin) },
                { upsert: true },
            );
        },
        async masterSource() {
            return (await savedMaster()) ? 'db' : 'env';
        },
    };
}
