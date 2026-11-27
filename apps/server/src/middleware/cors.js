// 쿠키가 브라우저에 저장되려면 Allow-Origin이 '*'이면 안 되므로 요청 Origin을 그대로 돌려준다
// 현재 동작: 어떤 Origin이든 허용한다 (S3, B-5에서 운영·베타 주소만으로)
export function cors(req, res, next) {
    const origin = req.headers.origin;
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Vary', 'Origin');
    }
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}
