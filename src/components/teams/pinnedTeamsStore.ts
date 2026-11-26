import { create } from 'zustand';

// 팀 고정 (V-3 11차). 팀 정보 Drawer의 핀 버튼으로 켜고 끈다. 고정한 팀은 메인 화면 팀 목록 맨 앞에, 먼저 고정한 팀이 앞에.
// 이 브라우저에 기억한다 (저장소를 쓸 수 없으면 지금 화면에만). 팀 색은 원래 순서로 정해져 고정해도 바뀌지 않는다

const STORAGE_KEY = 'semachi.pinnedTeams';

function readSaved(): string[] {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(saved)
            ? saved.filter((id): id is string => typeof id === 'string')
            : [];
    } catch {
        return [];
    }
}

function save(ids: string[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // 저장하지 못해도 지금 화면에는 적용한다
    }
}

interface PinnedTeamsState {
    /** 고정한 팀 id, 고정한 순서대로 (삭제된 팀의 id가 남아 있어도 목록에 없으면 무시한다) */
    ids: string[];
    toggle: (id: string) => void;
}

export const usePinnedTeamsStore = create<PinnedTeamsState>()((set, get) => ({
    ids: readSaved(),
    toggle: (id) => {
        const { ids } = get();
        const next = ids.includes(id) ? ids.filter((one) => one !== id) : [...ids, id];
        save(next);
        set({ ids: next });
    },
}));

/** 고정한 팀을 고정한 순서대로 앞에, 나머지는 원래 순서 */
export function pinnedFirst<T>(items: T[], idOf: (item: T) => string, pinnedIds: string[]): T[] {
    const byId = new Map(items.map((item) => [idOf(item), item]));
    const pinned = pinnedIds.flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
    });
    return [...pinned, ...items.filter((item) => !pinnedIds.includes(idOf(item)))];
}
