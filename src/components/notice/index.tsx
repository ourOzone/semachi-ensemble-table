import { useState, useCallback } from 'react';
import { useDrawerContext } from '@/context';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
    noticesQueryOptions,
    useAddNotice,
    useDeleteNotice,
    useNotices,
    useRefreshNotices,
} from '@/queries/notes';
import { noticeExists } from '@/api/notice';
import { Bell, ChevronRight } from 'lucide-react';
import NoticeDrawer from './NoticeDrawer';
import AddNoticeDrawer from './AddNoticeDrawer';
import DeleteNoticeDrawer from './DeleteNoticeDrawer';

const Notice = () => {
    const notices = useNotices();
    // 처음 불러오는 동안은 글씨 자리에 회색 상자 (V-3 1차)
    const { isPending } = useQuery(noticesQueryOptions);
    const refreshNotices = useRefreshNotices();
    const { mutateAsync: addNoticeAsync } = useAddNotice();
    const { mutateAsync: deleteNoticeAsync } = useDeleteNotice();
    const [id, setId] = useState('');
    const [text, setText] = useState('');
    const [pin, setPin] = useState('');
    const { openDrawer, closeAllDrawers } = useDrawerContext();

    // 이미 삭제된 공지인지 체크. PIN 확인 Drawer가 PIN을 확인하기 전에 사용한다 (true를 리턴하면 계속 진행)
    const checkNoticeExists = useCallback(
        async (id: string) => {
            try {
                await noticeExists(id);
                return true;
            } catch {
                setId('');
                setText('');
                setPin('');
                closeAllDrawers();
                refreshNotices();
                return false;
            }
        },
        [closeAllDrawers, refreshNotices],
    );

    const handleAddNotice = useCallback(
        async (text: string) => {
            try {
                await addNoticeAsync(text);
                setText('');
                setPin('');
                closeAllDrawers();
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            }
        },
        [addNoticeAsync, closeAllDrawers],
    );

    // 삭제 X 버튼: 바로 PIN 확인 Drawer를 연다 (이전에는 여기서 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleClickDelete = useCallback(
        (id: string) => {
            setId(id);
            openDrawer('deleteNotice');
        },
        [openDrawer],
    );

    // 이미 삭제됐으면 서버가 404를 준다 → 다른 실패와 같이 처리 (이전에는 삭제 전에 존재 확인 요청을 한 번 더 보냈다: 사전 결정 5)
    const handleDeleteNotice = useCallback(
        async (id: string) => {
            try {
                await deleteNoticeAsync(id);
            } catch {
                // 오류 알림 없음 (알림 기능 삭제, View 개편 때 새로 추가 예정)
            } finally {
                setId('');
                setPin('');
                closeAllDrawers();
            }
        },
        [closeAllDrawers, deleteNoticeAsync],
    );

    // 맨 위 공지의 첫 줄. 누르면 공지 목록(아직 옛 Drawer)
    const first = notices[0]?.text.split('\n')[0];

    return (
        <>
            {/*
              공지 카드 (V-3 1차에 미리 만듦, V-5 범위): 파란 바탕 antd 버튼 → 흰 카드 (합주판과 같은 모양).
              공지가 여러 개면 오른쪽에 나머지 개수
            */}
            <section className="ui w-full max-w-[1080px]">
                <button
                    type="button"
                    aria-busy={isPending}
                    onClick={() => openDrawer('notice')}
                    className="flex w-full items-center gap-3 rounded-card bg-surface px-4 py-4 text-left shadow-card transition-[background-color,scale] duration-150 hover:bg-neutral-50 active:scale-[0.99] md:gap-4 md:px-7 md:py-5"
                >
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-ink md:size-12">
                        <Bell className="size-5 md:size-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-bold text-neutral-500 md:text-[13px]">
                            공지
                        </span>
                        {isPending ? (
                            <Skeleton className="mt-1.5 h-5 w-48 max-w-full md:h-6 md:w-64" />
                        ) : (
                            <span
                                className={
                                    first
                                        ? 'block truncate text-[16px] font-bold text-ink md:text-[19px]'
                                        : 'block truncate text-[16px] text-neutral-500 md:text-[19px]'
                                }
                            >
                                {first || '공지가 딱히 없네요'}
                            </span>
                        )}
                    </span>
                    {notices.length > 1 && (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[12px] font-bold text-neutral-600 md:text-[13px]">
                            +{notices.length - 1}
                        </span>
                    )}
                    <ChevronRight className="size-5 shrink-0 text-neutral-400" aria-hidden />
                </button>
            </section>
            <NoticeDrawer
                drawerId="notice"
                notices={notices}
                setId={setId}
                handleClickDelete={handleClickDelete}
            />
            <AddNoticeDrawer
                drawerId="addNotice"
                text={text}
                setText={setText}
                pin={pin}
                setPin={setPin}
                handleAddNotice={handleAddNotice}
            />
            <DeleteNoticeDrawer
                drawerId="deleteNotice"
                id={id}
                pin={pin}
                setPin={setPin}
                checkNoticeExists={checkNoticeExists}
                handleDeleteNotice={handleDeleteNotice}
            />
        </>
    );
};

export default Notice;
