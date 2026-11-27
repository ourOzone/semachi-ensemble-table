import { toast } from 'sonner';

// 사용자에게 보여줄 알림 (View 개편 사전 결정 6: Sonner). 화면에는 앱 루트의 <Toaster />가 그린다.
// 변경(mutation) 알림은 기능 단계(V-2~)마다 그 기능의 화면에서 연결한다.

export const QUERY_ERROR_MESSAGE = '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.';

/**
 * 조회 실패 알림. 서버가 내려가면 4개 목록이 한꺼번에 실패하므로,
 * 같은 id로 띄워 알림이 하나만 보이게 한다 (Sonner는 같은 id의 알림을 새로 만들지 않고 갱신한다).
 */
export function notifyQueryError() {
    toast.error(QUERY_ERROR_MESSAGE, { id: 'query-error' });
}
