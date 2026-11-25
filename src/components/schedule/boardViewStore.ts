import { create } from 'zustand';
import type { BoardView } from '@/lib/calendar';

// 합주판 보기 방식 (View 개편 V-2 26차). 헤더의 스위치와 합주판이 함께 쓴다.
// 고른 방식은 이 브라우저에 기억한다 (저장소를 쓸 수 없으면 기본값)

const STORAGE_KEY = 'semachi.boardView';
/** 기본은 요일 고정 (27차, 이전: 오늘부터) */
const DEFAULT_VIEW: BoardView = 'weekday';

function readSaved(): BoardView {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === 'rolling' || saved === 'weekday' ? saved : DEFAULT_VIEW;
    } catch {
        return DEFAULT_VIEW;
    }
}

interface BoardViewState {
    view: BoardView;
    setView: (view: BoardView) => void;
}

export const useBoardViewStore = create<BoardViewState>()((set) => ({
    view: readSaved(),
    setView: (view) => {
        try {
            localStorage.setItem(STORAGE_KEY, view);
        } catch {
            // 저장하지 못해도 지금 화면에는 적용한다
        }
        set({ view });
    },
}));
