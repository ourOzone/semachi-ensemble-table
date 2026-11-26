//new version 7.0

const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const crypto = require('crypto');
const app = express();
const PORT = 8081;
require('dotenv').config();
const MASTER_PIN = process.env.MASTER_PIN;


//Mongo DB 연결
mongoose.connect(process.env.MONGO_DB)
  .then(() => console.log('connected'))
  .catch(() => console.log('failed'));

const teamSchema = new mongoose.Schema({
  name: String,
  desc: [String],
  type: String,
  publishDate: Date,
  pin: String,
});

const ensembleSchema = new mongoose.Schema({
  teamId: String,
  teamName: String,
  startTime: Number,
  endTime: Number,
  day: Number,
  type: String,
  due: Date,
  nextDate: Date,
  repeat: Boolean,
});

const noteSchema = new mongoose.Schema({
  text: String,
  pin: String,
});

const noticeSchema = new mongoose.Schema({
  content: String,
  publishDate: Date
});

const Team = mongoose.model('Team', teamSchema);
const Ensemble = mongoose.model('Ensemble', ensembleSchema);
const Note = mongoose.model('Note', noteSchema);
const Notice = mongoose.model('Notice', noticeSchema);

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 쿠키가 브라우저에 저장되려면 Allow-Origin이 '*'이면 안 되므로 요청 Origin을 그대로 돌려준다
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 방문자 쿠키 (활동 추적용)
const VISITOR_COOKIE = 'semachi_vid';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1년 (초)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next();

  let visitorId = parseCookies(req.headers.cookie)[VISITOR_COOKIE];

  // 없거나 형식이 이상한 값(로그 조작 시도 등)이면 새로 발급
  if (!visitorId || !UUID_RE.test(visitorId)) {
    visitorId = crypto.randomUUID();
  }

  // 요청마다 만료 기간을 연장한다
  res.setHeader('Set-Cookie',
    `${VISITOR_COOKIE}=${visitorId}; Max-Age=${VISITOR_COOKIE_MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=None`);

  req.visitorId = visitorId;
  next();
});

function append_log(contentToAdd) {
  const filePath = __dirname + '/log.txt';

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('파일을 읽을 수 없습니다:', err);
      return;
    }

    let lines = data.split('\n');

    if (lines.length >= 50000) {
      lines.shift();
    }

    lines.push(contentToAdd);

    const updatedContent = lines.join('\n');

    fs.writeFile(filePath, updatedContent, (err) => {
      if (err) {
        console.error('파일에 쓰기 실패:', err);
        return;
      }
    });
  });
}

function getTime() {
  const now = new Date();
  const kstOffset = 9 * 60; // 9 hours in minutes
  const kstTime = new Date(now.getTime() + (kstOffset * 60000));
  const year = kstTime.getFullYear();
  const month = String(kstTime.getMonth() + 1).padStart(2, '0');
  const day = String(kstTime.getDate()).padStart(2, '0');
  const hour = String(kstTime.getHours()).padStart(2, '0');
  const minute = String(kstTime.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${day}:${hour}:${minute}`;
}

app.get('/', (req, res) => {
  const filePath = __dirname + '/log.txt';
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('파일을 읽을 수 없습니다:', err);
      return res.status(500).send('Internal Server Error');
    }
    const lines = data.split('\n');
    res.status(200).send(lines.join('<br>'));
  });
});

// 전체팀
app.get('/teams', async (req, res) => {
  append_log(`${req.visitorId}_${getTime()}_pageload`);
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// 팀 추가
app.post('/team', async (req, res) => {
  try {
    var data = req.body;
    append_log(`${req.visitorId}_${getTime()}_addteam_${data.name}`);

    const newTeam = new Team({
      name: data.name,
      desc: data.desc,
      type: data.type,
      publishDate: data.publishDate,
	  pin: data.pin,
    });

    await newTeam.save();
    res.send({ id: newTeam._id });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

app.post('/check-team-pin', async (req, res) => {
  try {
    const { teamId, pin } = req.body;

    // teamId와 pin이 제공되지 않은 경우 오류 처리
    if (!teamId || !pin) {
      return res.status(400).json({ error: 'Both teamId and pin are required' });
    }

    if (pin === process.env.MASTER_PIN) {
      return res.json(true);
    }

    // 해당 팀을 데이터베이스에서 조회
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // 팀의 pin과 제공된 pin이 일치하는지 확인
    const isValidPin = team.pin === pin;

    // 결과를 true 또는 false로 반환
    return res.json(isValidPin);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


// 팀 삭제
app.delete('/team', async (req, res) => {
  const teamId = req.query.id;

  try {
    const existingTeam = await Team.findById(teamId);

    if (!existingTeam) {
      return res.status(404).json({ id: -1 });
    }

    append_log(`${req.visitorId}_${getTime()}_deleteteam_${existingTeam.name}`);
    const deletedEnsembles = await Ensemble.deleteMany({ teamId });
    const deletedTeam = await Team.findByIdAndDelete(teamId);

    if (deletedTeam) {
      res.json({ id: teamId });
    } else {
      res.status(500).send('Internal Server Error');
    }
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// 전체팀 삭제
app.delete('/teams', async (req, res) => {
  append_log(`${req.visitorId}_${getTime()}_전체팀을삭제했습니다.엄벌을내리십시오_`);
  try {
    const result = await Team.deleteMany({});
    res.json({ message: `All teams (${result.deletedCount}) have been successfully deleted.` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 팀 수정
app.put('/team', async (req, res) => {
  try {
    const teamId = req.query.id;
    const existingTeam = await Team.findById(teamId);

    if (!existingTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    append_log(`${req.visitorId}_${getTime()}_modifyteam_${existingTeam.name}`);

    existingTeam.name = req.body.name;
    existingTeam.desc = req.body.desc;
	  existingTeam.type = req.body.type;

    await existingTeam.save();
    await Ensemble.updateMany({ teamId }, { $set: { teamName: req.body.name } });

    res.json({ id: teamId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 팀 존재 여부 확인
app.get('/team/:id', async (req, res) => {
  const teamId = req.params.id;

  try {
    const existingTeam = await Team.findById(teamId);

    if (existingTeam) {
      res.json(true);
    } else {
      res.status(404).json(false);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 전체 합주
app.get('/ensembles', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작 시간을 설정

    const ensembles = await Ensemble.find({
      $or: [
        {
          repeat: true,
          due: { $not: { $lt: today } } // 반복되는 일정 중 반복 종료 날짜(due)가 오늘 이전이 아닌 것 (due가 없으면 포함)
        },
        {
          repeat: false,
          nextDate: { $gte: today } // 반복되지 않고, 아직 지나지 않은 일정
        }
      ]
    });

    res.json(ensembles);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});


// 합주 추가
app.post('/ensemble', async (req, res) => {
  try {
    const data = req.body;
    append_log(`${req.visitorId}_${getTime()}_addensemble_${data.teamName}`);

    const newEnsemble = new Ensemble({
      teamId: data.teamId,
      teamName: data.teamName,
      startTime: data.startTime,
      endTime: data.endTime,
      day: data.day,
      type: data.type,
      due: data.due,
      nextDate: data.nextDate,
      repeat: data.repeat,
    });

    await newEnsemble.save();
    res.send({ id: newEnsemble._id });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// 합주 삭제
app.delete('/ensemble', async (req, res) => {
  const ensembleId = req.query.id;

  try {
    const existingEnsemble = await Ensemble.findById(ensembleId);

    if (!existingEnsemble) {
      return res.status(404).json({ id: -1 });
    }

    append_log(`${req.visitorId}_${getTime()}_deleteensemble_${existingEnsemble.teamName}`);

    const deletedEnsemble = await Ensemble.findByIdAndDelete(ensembleId);

    if (deletedEnsemble) {
      res.json({ id: ensembleId });
    } else {
      res.status(500).send('Internal Server Error');
    }
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// 합주 존재하는지 확인
app.get('/ensemble/:id', async (req, res) => {
  const ensembleId = req.params.id;

  try {
    const existingEnsemble = await Ensemble.findById(ensembleId);

    if (existingEnsemble) {
      res.json(true);
    } else {
      res.status(404).json(false);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//합주 수정
app.put('/ensemble', async (req, res) => {
  const { teamId, startTime, endTime, day, type, due, nextDate, repeat } = req.body;
  const ensembleId = req.query.id

  try {
    // ensembleId가 제공되지 않으면 오류 처리
    if (!ensembleId) {
      return res.status(400).json({ error: 'Ensemble ID is required' });
    }

    const existingEnsemble = await Ensemble.findById(ensembleId);

    if (!existingEnsemble) {
      return res.status(404).json({ error: 'Ensemble not found' });
    }

    // 기존 합주 정보 수정
    existingEnsemble.teamId = teamId;
    existingEnsemble.startTime = startTime;
    existingEnsemble.endTime = endTime;
    existingEnsemble.day = day;
    existingEnsemble.type = type;
    existingEnsemble.due = due;
    existingEnsemble.nextDate = nextDate;
    existingEnsemble.repeat = repeat;

    // 합주 정보 저장
    await existingEnsemble.save();

    res.json({ message: 'Ensemble updated successfully', id: existingEnsemble._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 비고 목록
app.get('/notes', async (req, res) => {
  try {
    // 오늘 기준 8일 전 시간
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 8);

    // cutoff보다 오래된 note 삭제
    await Note.deleteMany({ _id: { $lt: mongoose.Types.ObjectId.createFromTime(cutoff.getTime() / 1000) } });

    // 최신 노트 가져오기
    const notes = await Note.find();
    res.json(notes.reverse());
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// 비고 삭제
app.delete('/note', async (req, res) => {
  const noteId = req.query.id;

  try {
    const existingNote = await Note.findById(noteId);

    if (!existingNote) {
      return res.status(404).json({ id: -1 });
    }

    append_log(`${req.visitorId}_${getTime()}_deletenote_${existingNote.text}`);

    const deletedNote = await Note.findByIdAndDelete(noteId);

    if (deletedNote) {
      res.json({ id: noteId });
    } else {
      res.status(500).send('Internal Server Error');
    }
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

// 비고 추가
app.post('/note', async (req, res) => {
    try {
        const data = req.body;
        append_log(`${req.visitorId}_${getTime()}_addnote_${data.text}`);

        const noteCount = await Note.countDocuments();

        if (noteCount >= 100) {
            return res.status(400).send('Note limit exceeded');
        }

        const newNote = new Note({
            text: data.text,
            pin: data.pin,
        });

        await newNote.save();
        res.send({ id: newNote._id });
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

// 합주 존재하는지 확인
app.get('/note/:id', async (req, res) => {
  const noteId = req.params.id;

  try {
    const existingNote = await Note.findById(noteId);

    if (existingNote) {
      res.json(true);
    } else {
      res.status(404).json(false);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


//노트 핀 대조
app.post('/check-note-pin', async (req, res) => {
  try {
    const { noteId, pin } = req.body;

    if (!noteId || !pin) {
      return res.status(400).json({ error: 'Both noteId and pin are required' });
    }

    if (pin === process.env.MASTER_PIN) {
      return res.json(true);
    }


    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }




    const isValidPin = note.pin === pin;

    // 결과를 true 또는 false로 반환
    res.json(isValidPin);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//공지사항 생성
app.post('/notice', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content are required' });
    }

    const publishDate = new Date();

    const newNotice = new Notice({ content, publishDate });
    await newNotice.save();

    res.status(201).json({ message: 'Notice created', id: newNotice._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//공지사항 읽기
app.get('/notices', async (req, res) => {
  try {
    const notices = (await Notice.find()).reverse();

    res.status(200).json(notices);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//공지사항 삭제
app.delete('/notice', async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Notice ID is required' });
    }

    const notice = await Notice.findById(id);

    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    await Notice.deleteOne({ _id: id });

    res.status(200).json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//공지 핀 대조
app.post('/check-notice-pin', async (req, res) => {
  try {
    const { pin } = req.body;

    if (!pin) {
      return res.status(400).json({ error: 'Pin is required' });
    }

    const isValidPin = pin === MASTER_PIN;
    res.json(isValidPin);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/notice/:id', async (req, res) => {
  const noticeId = req.params.id;

  try {
    const existingNotice = await Notice.findById(noticeId);

    if (existingNotice) {
      res.json(true);
    } else {
      res.status(404).json(false);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const https = require('https');

const sslOptions = {
  key: fs.readFileSync('/etc/letsencrypt/live/semachi.net/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/semachi.net/fullchain.pem'),
};

https.createServer(sslOptions, app).listen(8081, '0.0.0.0', () => {
  console.log('HTTPS 서버 실행 중: https://semachi.net:8081');
});
