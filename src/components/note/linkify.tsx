import type { ReactNode } from 'react';

// 한마디 글 속의 주소를 누를 수 있는 링크로 (V-4). http(s):// 또는 www.로 시작하는 것만.
// 링크 주소는 글에서 찾은 문자열에 https://만 붙여 만든다 (javascript: 등 다른 scheme은 링크가 되지 않는다)

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
/** 주소 끝에 붙은 문장 부호는 링크에서 뺀다 ("…보세요 https://a.com." → "https://a.com") */
const TRAILING_PUNCTUATION = /[.,!?;:)\]}'"…。、]+$/;
/** 문장 부호를 빼고도 주소 부분이 남아 있는지 */
const HAS_ADDRESS = /^(?:https?:\/\/|www\.)./i;

export function linkify(text: string): ReactNode[] {
    const parts: ReactNode[] = [];
    let last = 0;
    for (const match of text.matchAll(URL_PATTERN)) {
        const start = match.index;
        const raw = match[0].replace(TRAILING_PUNCTUATION, '');
        if (!HAS_ADDRESS.test(raw)) continue; // 글자로 둔다 (다음 조각에 함께 들어간다)
        if (start > last) parts.push(text.slice(last, start));
        const href = /^www\./i.test(raw) ? `https://${raw}` : raw;
        parts.push(
            <a
                key={start}
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-medium text-link underline underline-offset-2"
            >
                {raw}
            </a>,
        );
        last = start + raw.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
}
