import React, { useState, useRef } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { useFetchContext } from 'context';
import useMessage from 'hooks/useMessage';
import { url } from 'constants';
import { Button } from 'antd';
import { PlusCircleOutlined } from '@ant-design/icons';
import { Container } from 'components/common/Container';

const Notes = () => {
    const { notes, fetchData } = useFetchContext();
    const [message, contextHolder] = useMessage();
    const [text, setText] = useState('');
    const [pin, setPin] = useState('');
    const textRef = useRef();

    const handleSubmit = async () => {
        try {
            await axios.post(`${url}/notes`, {
                text: text,
                publishDate: new Date()
            });
            
            setText('');
            textRef.current.style.height = '6rem';
            fetchData();
        }
        catch {
            message.error('실패했어요. (너무 많아서 그럴지도요. 100개 까지만 돼요.)');
        }
    };

    const handleTextareaChange = (e) => {
        setText(e.target.value);
        textRef.current.style.height = 'auto';
        textRef.current.style.height = textRef.current.scrollHeight + 'px';
    };

    const handleNoteDelete = async (id) => {
        if (!window.confirm('진짜 삭제할래요?')) {
            return;
        }
        try {
            const { data } = await axios.get(`${url}/deletenote?id=${id}`);
        }
        catch {
            message.warning('이미 삭제된 글이에요.');
        }

        fetchData();
    };

    const handlePinChange = (e) => {
        const value = e.target.value;

        const filteredValue = value.replace(/\D/g, '').slice(0, 4);
        setPin(filteredValue);
    };

    return (
        <Container>
            {/* <InputWrapper>
                <Input
                    ref={textRef}
                    value={text}
                    onChange={handleTextareaChange}
                    placeholder='여따 새로 써요'
                />
                <RightWrapper>
                    <PinInput 
                        type="password"
                        inputMode="numeric"
                        pattern="\d*"
                        maxLength={4}
                        value={pin}
                        onChange={handlePinChange}
                        placeholder="비번 숫자 4개"
                    />
                    <Button onClick={handleSubmit}>추가</Button>
                </RightWrapper>
            </InputWrapper> */}
            {contextHolder}
            <AddButton>
                <PlusCircleOutlined />
                멋진 한마디 남겨요
            </AddButton>
            {notes && notes.map(note => (
                <Note key={note.id}>
                    <NoteText onBlur={handleSubmit}>{note.text}</NoteText>
                    <NoteDeleteButton onClick={() => handleNoteDelete(note.id)}>✕</NoteDeleteButton>
                </Note>
            ))}
        </Container>
    )
};

const AddButton = styled(Button)`
    display: flex;
    justify-content: flex-start;
    align-items: center;
    border-radius: 1rem;
    border: 0.125rem dashed ${({ theme }) => theme.darkGray};
    height: 5.5rem;
    box-shadow: none;

    & * {
        font-size: 1.25rem;
        color: ${({ theme }) => theme.darkGray};
        transition: color 0.3s ease;
    }
    & svg {
        font-size: 2.5rem;
    }

    &:hover {
        & *, svg {
            color: ${({ theme }) => theme.primary};
        }
    }

`;

const Note = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 0.5rem;
    min-height: 5rem;
    /* background-color: ${({ theme }) => theme.background}; */
    border-radius: 1rem;
    border: 1px solid ${({ theme }) => theme.border};
    box-shadow: 0 0.125rem 0 rgba(0, 0, 0, 0.02);
`;

const NoteText = styled.div`
    padding: 1rem;
    font-size: 1.25rem;
    white-space: pre-line;
    word-break: break-all;
`;

const NoteDeleteButton = styled.div`
    margin: 8px 16px;
    font-size: 1.25rem;
    user-select: none;
    height: 48px;
    cursor: pointer;
`;

// const InputWrapper = styled.div`
//     display: flex;
//     width: 100%;
// `;

// const RightWrapper = styled.div`
//     display: flex;
//     flex-direction: column;
//     gap: 0.5rem;
//     padding-left: 0.5rem;
// `;

// const Input = styled.textarea`
//     font-size: 1.25rem;
//     resize: none;
//     border: none;
//     overflow: hidden;
//     height: auto;
//     min-height: 6.5rem;
//     width: 100%;
//     padding: 1rem;
//     border-radius: 1rem;
//     background-color: ${({ theme }) => theme.background};
//     border: 1px solid ${({ theme }) => theme.border};
    
//     &:focus {
//         outline: 2px solid ${({ theme }) => theme.primary};
//     }

//     ${media.large` // 모바일에서 16보다 작으면 누를 때 화면이 확대돼버림
//         font-size: 160%;
//         min-height: 7.5rem;
//     `}
// `;

// const PinInput = styled.input`
//     font-size: 1.25rem;
//     padding: 1rem;
//     border-radius: 1rem;
//     background-color: ${({ theme }) => theme.background};
//     border: 1px solid ${({ theme }) => theme.border};
//     width: 10rem;

//     &:focus {
//         outline: 2px solid ${({ theme }) => theme.primary};
//     }

//     ${media.large` // 모바일에서 16보다 작으면 누를 때 화면이 확대돼버림
//         font-size: 160%;
//         width: 12rem;
//     `}
// `;

// const Button = styled.div`
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     background-color: ${({ theme }) => theme.primary};
//     padding: 0.5rem 1rem;
    
//     width: 100%;
//     height: 100%;
//     border-radius: 100rem;
//     font-size: 1.25rem;
//     color: ${({ theme }) => theme.white};
//     user-select: none;
//     cursor: pointer;
// `;

export default Notes;