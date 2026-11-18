import { useCallback } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { ConfigProvider, Calendar, Button } from 'antd';
import koKR from 'antd/locale/ko_KR';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { useEnsembleContext, useDrawerContext } from '@/context';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import 'dayjs/locale/ko';

dayjs.extend(isSameOrBefore);
dayjs.locale('ko');

const isBeforeToday = (date) => date.isBefore(dayjs(), 'day');

const UpdateEnsembleDrawer3 = ({ drawerId }) => {
    const { repeat, setNextDate, currentMonth, setCurrentMonth } = useEnsembleContext();
    const { openDrawer } = useDrawerContext();

    const handleClick = useCallback(
        (date) => {
            setNextDate(date);
            openDrawer('updateEnsemble4');
        },
        [setNextDate, openDrawer],
    );

    return (
        // onClose시 nextDate는 초기화 필요 없음
        <Drawer drawerId={drawerId} onClose={() => setCurrentMonth(dayjs())}>
            <Title>{repeat ? '언제 시작으로 바꾸나요' : '언제로 바꾸나요'} 🚀</Title>
            <ConfigProvider locale={koKR}>
                <CalendarWrapper>
                    <Header>
                        <Arrow
                            onClick={() => setCurrentMonth(currentMonth.subtract(1, 'month'))}
                            disabled={currentMonth.isSameOrBefore(dayjs(), 'month')}
                        >
                            <LeftOutlined />
                        </Arrow>
                        <MonthTitle>{currentMonth.format('YYYY년 M월')}</MonthTitle>
                        <Arrow onClick={() => setCurrentMonth(currentMonth.add(1, 'month'))}>
                            <RightOutlined />
                        </Arrow>
                    </Header>
                    <Calendar
                        value={currentMonth}
                        headerRender={() => null}
                        disabledDate={(d) => isBeforeToday(d)}
                        onSelect={handleClick}
                    />
                </CalendarWrapper>
            </ConfigProvider>
        </Drawer>
    );
};

const Title = styled.span`
    font-size: 2.5rem;
    font-family: Bold;
`;

const CalendarWrapper = styled.div`
    width: 100%;
    margin-top: 2rem;

    .ant-picker-cell {
        border-bottom: none !important;
        border-radius: 1rem;
        padding: 0;
        text-align: center;
        cursor: pointer;
        transition: background-color 0.3s;

        .ant-picker-cell-inner {
            border: none;
            border-radius: 1rem;
            margin: 0;
            padding: 1.5rem 0;
        }

        // 날짜 텍스트
        .ant-picker-calendar-date-value {
            font-size: 1.5rem;
            user-select: none;
        }

        // 기존에 자리를 차지하고 있는, 스케줄 등을 담는 용도의 칸
        .ant-picker-calendar-date-content {
            display: none;
        }

        // 없으면 오늘 날짜에 hover시 background 안바뀜
        .ant-picker-calendar-date-today:hover {
            background-color: rgba(0, 0, 0, 0.04) !important;
        }
    }

    // 요일
    .ant-picker-content {
        thead > tr > th {
            padding: 0 0 1rem !important;
            font-family: Bold;
            font-size: 1.25rem;
            text-align: center;
        }
    }

    // 배경
    .ant-picker-panel {
        background-color: ${({ theme }) => theme.white} !important;
    }

    // 전달/다음달 날짜 삭제
    .ant-picker-date-panel .ant-picker-cell:not(.ant-picker-cell-in-view) .ant-picker-cell-inner {
        display: none;
        cursor: default;
    }

    // hover 등을 비활성화
    .ant-picker-date-panel .ant-picker-cell:not(.ant-picker-cell-in-view) {
        pointer-events: none;
    }

    // 지난 날짜들 비활성화
    .ant-picker-cell-disabled {
        cursor: not-allowed;
        .ant-picker-cell-inner:hover {
            background-color: transparent !important;
        }
    }

    // 디폴트로 오늘 날짜가 selected 상태인데 그 스타일을 지움
    .ant-picker-cell-selected {
        .ant-picker-cell-inner {
            background-color: transparent !important;
            .ant-picker-calendar-date-value {
                color: black !important;
            }
        }
    }
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
`;

const Arrow = styled(Button)`
    padding: 1.5rem 1rem !important;
    & svg {
        font-size: 2rem;
        height: 2rem;
    }
`;

const MonthTitle = styled.div`
    font-size: 2rem;
    font-family: Bold;
`;

export default UpdateEnsembleDrawer3;
