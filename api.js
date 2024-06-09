const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = 8080;

//Mongo DB 연결
mongoose.connect('mongodb+srv://dion:kritoXkrito1!@semachi.58nyphe.mongodb.net/')
  .then(() => console.log('connected'))
  .catch(() => console.log('failed'))

const teamSchema = new mongoose.Schema({
  name: String,
  desc: String,
  type: String,
  publishDate: Date,
});

const ensembleSchema = new mongoose.Schema({
  teamId: String,
  teamName: String,
  startTime: Number,
  endTime: Number,
  day: Number,
  room: String,
  type: String,
  due: Date,
});

const noteSchema = new mongoose.Schema({
  text: String,
}); 

const Team = mongoose.model('Team', teamSchema);
const Ensemble = mongoose.model('Ensemble', ensembleSchema);
const Note = mongoose.model('Note', noteSchema);

app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
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
      console.log('파일에 내용을 성공적으로 추가했습니다.');
    });
  });
}

function getTime() {
  const now = new Date();
  const kstOffset = -540;
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
    res.send(lines.join('<br>'));
    console.log(data);
  });
});

//전체팀
app.get('/teams', async (req, res) => {
  append_log(`${req.ip}_${getTime()}_pageload`);
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

//팀추가
app.post('/teams', async (req, res) => {
  try {
    var data = req.body;
    append_log(`${req.ip}_${getTime()}_addteam_${data.name}`)

    const newTeam = new Team({
      name: data.name,
      desc: data.desc,
      type: data.type,
      publishDate: data.publishDate,
    });

    await newTeam.save();
    res.send({ id: newTeam._id });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

//팀삭제
app.get('/deleteteam', async (req, res) => {
  const teamId = req.query.id;

  try {
    const existingTeam = await Team.findById(teamId);
  
    if (!existingTeam) {
      return res.status(404).json({ id: -1 });
    }

    append_log(`${req.ip}_${getTime()}_deleteteam_${existingTeam.name}`)
    const deletedEnsembles = await Ensemble.deleteMany({ teamId });
    const deletedTeam = await Team.findByIdAndDelete(teamId);

    if (deletedTeam) {
      res.json({ id: teamId});
    } else {
      res.status(500).send('Internal Server Error');
    }
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});


//전체팀삭제
app.get('/deleteallteams', async (req, res) => {
  append_log(`${req.ip}_${getTime()}_전체팀을삭제했습니다.엄벌을내리십시오_`)
  try {
    const result = await Team.deleteMany({});
    res.json({ message: `All teams (${result.deletedCount}) have been successfully deleted.` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//팀수정
app.post('/teammodify', async (req, res) => {
  try {
    const teamId = req.query.id;
    const existingTeam = await Team.findById(teamId);

    if (!existingTeam) {
      return res.status(404).json({ error: 'Team not found' });
    }

    append_log(`${req.ip}_${getTime()}_modifyteam_${existingTeam.name}`)

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

//팀 존재 여부 확인
app.get('/teamexist', async (req, res) => {
  const teamId = req.query.id;

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


//전체합주
app.get('/ensembles', async (req, res) => {
  try {
    const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ensembles = await Ensemble.find({ due: { $gte: today } });
    res.json(ensembles);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});


//합주추가
app.post('/ensembles', async (req, res) => {
  try {
    const data = req.body;
    append_log(`${req.ip}_${getTime()}_addensemble_${data.teamName}`)

    const newEnsemble = new Ensemble({
      teamId: data.teamId,
      teamName: data.teamName,
      startTime: data.startTime,
      endTime: data.endTime,
      day: data.day,
      room: data.room,
      type: data.type,
      due: data.due,
    });

    await newEnsemble.save();
    res.send({ id: newEnsemble._id });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

//합주삭제
app.get('/deleteensemble', async (req, res) => {
  const ensembleId = req.query.id;

  try {
    const existingEnsemble = await Ensemble.findById(ensembleId);

    if (!existingEnsemble) {
      return res.status(404).json({ id: -1 });
    }

    append_log(`${req.ip}_${getTime()}_deleteensemble_${existingEnsemble.teamName}`)

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

//합주정보
app.get('/ensembleinfo', async (req, res) => {
  const ensembleId = req.query.id;

  try {
    const ensemble = await Ensemble.findById(ensembleId);

    if (!ensemble) {
      return res.status(404).json({ id: -1 });
    }

    const team = await Team.findById(ensemble.teamId);

    if (!team) {
      return res.status(404).json({ id: -1 });
    }

    const ensembleInfo = {
      id: ensemble.teamId,
      name: team.name,
      desc: team.desc,
      teamType: team.type,
      start_time: ensemble.startTime,
      end_time: ensemble.endTime,
      room: ensemble.room,
      type: ensemble.type,
      due: ensemble.due,
      day: ensemble.day,
    };

    res.json(ensembleInfo);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

//비고목록
app.get('/notes', async (req, res) => {
  try {
    const notes = await Note.find();
    res.json(notes.reverse());
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});

//비고삭제
app.get('/deletenote', async (req, res) => {
  const noteId = req.query.id;

  try {
    const existingNote = await Note.findById(noteId);

    if (!existingNote) {
      return res.status(404).json({ id: -1 });
    }

    append_log(`${req.ip}_${getTime()}_deletenote_${existingNote.text}`)

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

//비고추가
app.post('/notes', async (req, res) => {
    try {
      const data = req.body;
      append_log(`${req.ip}_${getTime()}_addnote_${data.text}`)

      if (data.text.length > 100) {
        return res.status(400).send('Text exceeds 100 characters');
      }
  
      const newNote = new Note({
        text: data.text,
      });
  
      await newNote.save();
      res.send({ id: newNote._id });
    } catch (error) {
      res.status(500).send('Internal Server Error');
    }
  });
  



app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});