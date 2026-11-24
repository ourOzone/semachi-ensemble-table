import { useState, useCallback } from 'react';
import Drawer from '@/components/common/Drawer';
import styled from 'styled-components';
import { Button, Divider, Segmented } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTeamContext, useDrawerContext } from '@/context';
import { openAddEnsemble } from '@/components/schedule/addEnsembleStore';
import type { DrawerId } from '@/types';
import type { CheckTeamExists } from './types';

const memberLabels = ['보컬', '기타', '베이스', '드럼', '키보드', '매니저'];

interface TeamInfoDrawerProps {
    drawerId: DrawerId;
    checkTeamExists: CheckTeamExists;
}

const TeamInfoDrawer = ({ drawerId, checkTeamExists }: TeamInfoDrawerProps) => {
    const { id, type, name, desc, setTeamOrgStates } = useTeamContext();
    const { openDrawer, closeAllDrawers } = useDrawerContext();
    const [option, setOption] = useState('팀원');

    const handleClickAddEnsemble = useCallback(
        async (id: string) => {
            // 팀을 골라 둔 합주 잡기 Drawer로 바뀐다 (닫으면 팀 정보로 돌아온다, View 개편 V-2 21차)
            if (await checkTeamExists(id)) openAddEnsemble({ teamId: id, returnTo: 'teamInfo' });
        },
        [checkTeamExists],
    );

    const handleClickUpdateTeam = useCallback(
        async (id: string, type: string, name: string, desc: string[]) => {
            if (await checkTeamExists(id)) {
                // team 수정시 수정하다 뒤로가기 했을 때 state가 바뀌지 않도록 하기 위함
                setTeamOrgStates(type, name, desc);
                openDrawer('updateTeam1');
            }
        },
        [setTeamOrgStates, openDrawer],
    );

    const handleClickDeleteTeam = useCallback(async (id: string) => {
        if (await checkTeamExists(id)) {
            openDrawer('deleteTeam');
        }
    }, []);

    return (
        <Drawer drawerId={drawerId} onClose={() => setOption('팀원')} background>
            <Card>
                <Name>{name}</Name>
                <Type>{type}</Type>
                <ButtonWrapper>
                    <StyledButton type="primary" onClick={() => handleClickAddEnsemble(id)}>
                        <PlusOutlined />
                        합주 추가
                    </StyledButton>
                </ButtonWrapper>
                <ButtonWrapper>
                    <StyledButton onClick={() => handleClickUpdateTeam(id, type, name, desc)}>
                        <EditOutlined />팀 수정
                    </StyledButton>
                    <StyledButton danger onClick={() => handleClickDeleteTeam(id)}>
                        <DeleteOutlined />팀 삭제
                    </StyledButton>
                </ButtonWrapper>
            </Card>
            <Card>
                <StyledSegmented
                    block
                    options={['팀원', '셋리']}
                    onChange={(opt) => setOption(opt)}
                />
                {option === '팀원' ? (
                    <MemberWrapper>
                        {memberLabels.map((label, idx) => (
                            <>
                                <Member>
                                    <MemberLabel idx={idx}>{label}</MemberLabel>
                                    <MemberName>{desc[idx]}</MemberName>
                                </Member>
                                {idx < memberLabels.length - 1 && <StyledDivider />}
                            </>
                        ))}
                    </MemberWrapper>
                ) : (
                    <Desc>{desc[6]}</Desc>
                )}
            </Card>
        </Drawer>
    );
};

const Card = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: ${({ theme }) => theme.white};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 1.5rem;
    box-shadow: 0 0.25rem 0 rgba(0, 0, 0, 0.02);
    padding: 1rem;
    margin-bottom: 1rem;
    gap: 0.5rem;
`;

const ButtonWrapper = styled.div`
    display: flex;
    gap: 0.5rem;
    width: 100%;
    justify-content: center;
`;

const MemberWrapper = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 0.5rem;
`;

const Name = styled.span`
    font-size: 2rem;
    font-family: Bold;
    text-align: center;
    margin-top: 0.5rem;
`;

const Type = styled.span`
    color: ${({ theme }) => theme.darkGray};
    font-size: 1.25rem;
    margin-bottom: 1rem;
`;

const Member = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
`;

interface MemberLabelProps {
    idx: number;
}

const MemberLabel = styled.span<MemberLabelProps>`
    font-size: 1.5rem;
    font-family: Bold;
    min-width: 6rem;
    background-color: ${({ theme, idx }) => theme.eventColors[idx]};
    border-radius: 1rem;
    padding: 0.375rem;
    color: white;
    text-align: center;
    box-shadow: 0 0.25rem 0.125rem ${({ theme, idx }) => theme.eventColors[idx]}33;
`;

const MemberName = styled.span`
    font-size: 1.5rem;
    color: ${({ theme }) => theme.black};
`;

const StyledButton = styled(Button)`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    border-radius: 1.5rem;
    height: auto;

    & span {
        margin: 1rem 0 !important;
        font-family: Bold;
        font-size: 1.5rem !important;
    }
    & svg {
        font-size: 1.5rem;
    }
`;

const StyledSegmented = styled(Segmented<string>)`
    width: 100%;
    border-radius: 1rem;
    padding: 0.375rem;
    & * {
        border-radius: 1rem !important;
    }
    & .ant-segmented-item-label {
        padding: 0.5rem;
        font-size: 1.5rem;
        font-family: Bold;
    }
`;

const StyledDivider = styled(Divider)`
    margin: 0.5rem 0;
`;

const Desc = styled.div`
    font-size: 1.25rem;
    white-space: pre-wrap; // 개행
    padding: 1.25rem;
    overflow: scroll;
    width: 100%;
    min-height: 20.8rem;
    background-color: ${({ theme }) => theme.antGray};
    border-radius: 1rem;
    line-height: 1.5;
`;

export default TeamInfoDrawer;
