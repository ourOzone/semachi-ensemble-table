// Drawer ID. stores/drawer의 openedDrawers 스택에 쓴다.

export type DrawerId =
    // 공지
    | 'notice'
    // 날적이 (코드 이름 note)
    | 'addNote'
    | 'deleteNote'
    // 팀
    | 'teamInfo'
    | 'eventInfo'
    | 'addTeam'
    | 'updateTeam'
    // 합주
    | 'ensembleInfo'
    | 'slotInfo'
    | 'addEnsemble'
    | 'updateEnsemble'
    // 설정 (V-3 1차)
    | 'settings';
