/**
 * 팀 아닌 일정(소모임·회의 등)의 줄무늬 (V-2). 메인 화면의 합주판 블록과 팀 목록 칩에만 쓴다 (V-3 6차, 사용자 결정:
 * 합주 잡기 Drawer의 팀 고르기·소모임 정보 Drawer 머리에서는 뺐다. 합주 정보 Drawer 머리에도 없다).
 * 팀 색 바탕 위에 반투명 흰 빗금을 겹친다. 빗금 4px, 간격 12px (V-3 3차: 3px·4px에서 듬성듬성하게)
 */
export const EVENT_STRIPES =
    'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.22) 0 4px, transparent 4px 16px)';
