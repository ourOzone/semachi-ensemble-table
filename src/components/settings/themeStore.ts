import { create } from 'zustand';

// 다크 모드 (V-3 1차). 처음에는 기기 설정(prefers-color-scheme)을 따르고, 설정 Drawer에서 바꾸면 이 브라우저에 기억한다.
// 기억한 값이 없는 동안은 기기 설정이 바뀌면 함께 바뀐다.
// html에 `dark` 클래스를 붙이면 index.css의 `.dark` 토큰(바탕·글씨·회색 단계 등)이 바뀐다.
// 첫 화면이 밝게 번쩍이지 않도록 index.html의 인라인 스크립트가 같은 규칙으로 렌더링 전에 클래스를 먼저 붙인다

export const THEME_STORAGE_KEY = 'semachi.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
/** 브라우저 위쪽 막대 색 (index.html의 theme-color). 페이지 바탕(--color-page)과 같은 값 */
const THEME_COLOR = { light: '#f2f3f5', dark: '#111113' } as const;

function readSaved(): boolean | null {
    try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        return saved === 'dark' ? true : saved === 'light' ? false : null;
    } catch {
        return null;
    }
}

function systemDark(): boolean {
    try {
        return window.matchMedia(DARK_QUERY).matches;
    } catch {
        return false;
    }
}

/** 지금 적용할 값: 기억한 값, 없으면 기기 설정 */
export function resolveDark(): boolean {
    return readSaved() ?? systemDark();
}

/** html의 dark 클래스와 theme-color를 맞춘다 */
export function applyTheme(dark: boolean) {
    document.documentElement.classList.toggle('dark', dark);
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? THEME_COLOR.dark : THEME_COLOR.light);
}

interface ThemeState {
    dark: boolean;
    /** 설정 Drawer의 스위치: 고른 값을 기억한다 (이후 기기 설정을 따르지 않음) */
    setDark: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()((set) => ({
    dark: resolveDark(),
    setDark: (dark) => {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, dark ? 'dark' : 'light');
        } catch {
            // 저장하지 못해도 지금 화면에는 적용한다
        }
        set({ dark });
    },
}));

applyTheme(useThemeStore.getState().dark);
useThemeStore.subscribe((state) => applyTheme(state.dark));

// 기억한 값이 없으면 기기 설정을 따라간다
try {
    window.matchMedia(DARK_QUERY).addEventListener('change', (event) => {
        if (readSaved() === null) useThemeStore.setState({ dark: event.matches });
    });
} catch {
    // matchMedia가 없는 환경
}
