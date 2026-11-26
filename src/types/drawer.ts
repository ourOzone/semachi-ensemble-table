// Drawer ID. context/drawer의 openedDrawers 스택과 각 Drawer 컴포넌트의 drawerId prop에 쓴다.

export type DrawerId =
    // 공지
    | 'notice'
    | 'addNotice'
    | 'deleteNotice'
    // 메모
    | 'addNote'
    | 'deleteNote'
    // 팀
    | 'teamInfo'
    | 'eventInfo'
    | 'addTeam1'
    | 'addTeam2'
    | 'addTeam3'
    | 'addTeam4'
    | 'addTeam5'
    | 'addTeam6'
    | 'updateTeam1'
    | 'updateTeam2'
    | 'updateTeam3'
    | 'updateTeam4'
    | 'updateTeam5'
    // 합주
    | 'ensembleInfo'
    | 'slotInfo'
    | 'addEnsemble'
    | 'updateEnsemble'
    // 설정 (V-3 1차)
    | 'settings';
