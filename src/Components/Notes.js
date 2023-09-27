import React, { useState, useRef } from 'react';
import styled from 'styled-components';

const Notes = () => {
    const [text, setText] = useState('');
    const textRef = useRef();

    const handleTextareaChange = (e) => {
        setText(e.target.value);
        textRef.current.style.height = 'auto';
        textRef.current.style.height = textRef.current.scrollHeight + 'px';
    };    

    return (
        <Container>
            <NotesLabelContainer>
                <NotesTitle>비고</NotesTitle>
                <NotesDesc>이번 주만 합주 안 해요, 이펙터 패치 쓸래요 등등</NotesDesc>
            </NotesLabelContainer>
            <NotesText
                ref={textRef}
                value={text}
                onChange={handleTextareaChange}
                placeholder='비어있어요'
            />
        </Container>
    )
};

const Container = styled.div`
    display: flex;
    flex-direction: column;
    background-color: ${({ theme }) => theme.white};
    border-radius: 40px;
    padding: 32px 16px 16px;
    width: 100%;
    max-width: 1080px;
`;

const NotesLabelContainer = styled.div`
    display: flex;
    align-items: flex-end;
    margin-left: 24px;
`;

const NotesTitle = styled.div`
    font-size: 200%;
    margin-right: 8px;
    user-select: none;
`;

const NotesDesc = styled.div`
    color: ${({ theme }) => theme.gray};
    user-select: none;
`;

const NotesText = styled.textarea`
    resize: none;
    border: none;
    overflow: hidden;
    font-size: 125%;
    min-height: 100px;
    height: auto;
    margin: 24px 16px 16px;
    padding: 16px;
    background-color: ${({ theme }) => theme.background};
    border-radius: 16px;
    
    &:focus {
        outline: 2px solid ${({ theme }) => theme.primary};
    }
`;

export default Notes;