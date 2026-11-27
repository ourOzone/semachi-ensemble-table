// 개발 서버를 켜기 전에 포트가 비어 있는지 본다. 이미 켜 둔 개발 서버가 있으면 알아보기 쉬운 말로 끝낸다
// (확인하지 않으면 메모리 MongoDB가 알아보기 어려운 오류를 내며 꺼진다)
import net from 'node:net';

function canListen(port: number, host: string) {
    return new Promise<boolean>((resolve) => {
        const probe = net.createServer();
        probe.once('error', () => resolve(false));
        probe.once('listening', () => probe.close(() => resolve(true)));
        probe.listen(port, host);
    });
}

// 서버는 모든 주소(0.0.0.0), 메모리 MongoDB는 127.0.0.1에서 듣는다. 윈도우는 한쪽이 쓰고 있어도 다른 쪽은 열려 보일 수 있어 둘 다 본다
async function isFree(port: number) {
    return (await canListen(port, '127.0.0.1')) && (await canListen(port, '0.0.0.0'));
}

export async function exitIfPortsBusy(ports: Record<string, number>) {
    const busy: string[] = [];
    for (const [name, port] of Object.entries(ports)) {
        if (!(await isFree(port))) busy.push(`${name}(포트 ${port})`);
    }
    if (busy.length > 0) {
        console.error(
            `이미 쓰고 있는 포트가 있습니다: ${busy.join(', ')}\n` +
                '다른 터미널에 켜 둔 개발 서버(pnpm dev:server·dev:server:sample)가 있으면 그 터미널에서 Ctrl+C로 끈 뒤 다시 실행하세요.',
        );
        process.exit(1);
    }
}
