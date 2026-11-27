// 관리자 화면에서 활동 기록을 사람이 읽을 말로 (백엔드 개편 B-7)
import dayjs from 'dayjs';
import type { Activity } from '@/api/admin';

const ACTION_LABELS: Record<string, string> = {
    visit: '방문',
    'team.create': '팀 만들기',
    'team.update': '팀 수정',
    'team.delete': '팀 삭제',
    'ensemble.create': '합주 잡기',
    'ensemble.update': '합주 수정',
    'ensemble.delete': '합주 삭제',
    'note.create': '날적이 남기기',
    'note.delete': '날적이 삭제',
    'notice.create': '공지 올리기',
    'notice.delete': '공지 삭제',
    'pin.check': 'PIN 확인',
    'admin.login': '관리자 로그인',
    'admin.master-pin': '마스터 PIN 바꾸기',
};

/** 거르기 목록 (동작 앞부분) */
export const ACTION_FILTERS: [value: string, label: string][] = [
    ['', '모든 동작'],
    ['visit', '방문'],
    ['team', '팀'],
    ['ensemble', '합주'],
    ['note', '날적이'],
    ['notice', '공지'],
    ['pin', 'PIN 확인'],
    ['admin', '관리자'],
];

export const RESULT_LABELS: Record<string, string> = {
    ok: '성공',
    'wrong-pin': 'PIN 틀림',
    'not-found': '대상 없음',
    blocked: '막힘',
    error: '오류',
};

export const RESULT_FILTERS: [value: string, label: string][] = [
    ['', '모든 결과'],
    ...Object.entries(RESULT_LABELS),
];

export const actionLabel = (action: string) => ACTION_LABELS[action] ?? action;

/** 어떤 PIN으로: 팀 PIN·글 PIN(대상의 PIN) 또는 마스터 PIN. PIN 값은 서버도 모른다 */
export function pinLabel({ pin, target }: Pick<Activity, 'pin' | 'target'>) {
    if (pin === 'master') return '마스터 PIN';
    if (pin === 'own') return target?.kind === 'note' ? '글 PIN' : '팀 PIN';
    return undefined;
}

/** "11/27 14:03:22" (이 기기의 시간대: 한국) */
export const formatTime = (iso: string) => dayjs(iso).format('M/D HH:mm:ss');

/** "모바일 · iOS 18.1 · Safari 18" */
export function formatDevice(device: Activity['device'] | null | undefined) {
    if (!device) return undefined;
    const kind = { mobile: '모바일', tablet: '태블릿', desktop: 'PC', bot: '봇' }[
        device.kind ?? ''
    ];
    return [kind, device.os, device.browser].filter(Boolean).join(' · ') || undefined;
}

/** 방문자 id(UUID)는 앞 8자리만 보여 준다 */
export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : '없음');

const show = (value: unknown) => {
    if (value === undefined || value === null || value === '') return '(없음)';
    if (Array.isArray(value)) return value.map((v) => (v === '' ? '·' : String(v))).join(', ');
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))
        return dayjs(value).format('YYYY-MM-DD HH:mm');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
};

/** 수정 전·후에서 바뀐 것만 "이름: 전 → 후" */
export function changes(before: Activity['before'], after: Activity['after']) {
    if (!before || !after) return [];
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
    return keys
        .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        .map((key) => ({ key, from: show(before[key]), to: show(after[key]) }));
}

/** 만든 내용·지운 내용을 "이름: 값" 줄로 (목록 필드 ensembles 등은 개수만) */
export function fields(doc: Record<string, unknown> | undefined) {
    if (!doc) return [];
    return Object.entries(doc)
        .filter(([key]) => !['createdAt', 'updatedAt'].includes(key))
        .map(([key, value]) => ({
            key,
            value:
                Array.isArray(value) && value.some((v) => typeof v === 'object')
                    ? `${value.length}건`
                    : show(value),
        }));
}
