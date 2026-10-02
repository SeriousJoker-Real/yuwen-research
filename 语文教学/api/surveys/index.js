// /api/surveys/index.js - 调研列表和创建
const { readSurveys, writeSurveys, readResponses, generateId, handleCors, ensureDataDir, writeResponses } = require('../_utils');

// 初始化演示数据
function initDemoData() {
  const surveys = readSurveys();
  if (surveys.length > 0) return;

  const demoSurvey = {
    id: 'demo-001',
    title: '《荷塘月色》课前调研',
    subtitle: '请认真填写，帮助老师了解你的预习情况',
    textTitle: '荷塘月色',
    textAuthor: '朱自清',
    textType: 'prose',
    textTypeName: '散文',
    gradeLevel: 'senior',
    classes: ['高一(1)班', '高一(2)班', '高一(3)班', '高一(4)班'],
    status: 'active',
    createdAt: new Date().toISOString(),
    questions: [
      { id: 'q1', type: 'choice', text: '你之前读过朱自清的其他散文吗？', options: ['读过很多篇', '读过一两篇', '只听说过名字', '完全没听说过'] },
      { id: 'q2', type: 'open', text: '读完《荷塘月色》，你觉得这篇文章主要写了什么？请用自己的话简要概括。' },
      { id: 'q3', type: 'open', text: '文中哪些描写或句子让你印象最深？请摘抄一两句并说说理由。' },
      { id: 'q4', type: 'open', text: '读了这篇散文，你感受到作者怎样的心情或情感？你是从哪些地方看出来的？' },
      { id: 'q5', type: 'open', text: '读这篇文章时，你有什么不懂的地方或想跟老师同学探讨的问题吗？' },
      { id: 'q6', type: 'open', text: '你觉得这篇文章写得好在哪里？或者你有什么不太喜欢的地方？' }
    ]
  };

  writeSurveys([demoSurvey]);

  const demoResponses = [
    { responseId: 'r1', surveyId: 'demo-001', studentName: '张小明', studentClass: '高一(1)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', questionText: '你之前读过朱自清的其他散文吗？', answer: '读过一两篇' },
        { questionId: 'q2', questionType: 'open', questionText: '读完《荷塘月色》...', answer: '这篇文章主要讲了作者晚上去荷塘边散步，看到了美丽的荷塘月色景色，心情从不宁静变得稍微平静了一些。' },
        { questionId: 'q3', questionType: 'open', questionText: '文中哪些描写...', answer: '"曲曲折折的荷塘上面，弥望的是田田的叶子。叶子出水很高，像亭亭的舞女的裙。"这句话写得特别美，把荷叶比作舞女的裙子，很有画面感。' },
        { questionId: 'q4', questionType: 'open', questionText: '你感受到作者怎样的心情...', answer: '我觉得作者一开始心情不好，后来看到荷塘月色的美景后心情好了一些，但好像还是有些烦恼。' },
        { questionId: 'q5', questionType: 'open', questionText: '有什么不懂的地方...', answer: '我不太明白作者为什么一开始说"心里颇不宁静"，发生了什么事？还有最后为什么要想到采莲的事情？' },
        { questionId: 'q6', questionType: 'open', questionText: '你觉得这篇文章写得好在哪里...', answer: '写得很好，景色描写特别美，读着就像在看一幅画。就是有些地方不太懂。' }
      ]
    },
    { responseId: 'r2', surveyId: 'demo-001', studentName: '李小红', studentClass: '高一(1)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', answer: '只听说过名字' },
        { questionId: 'q2', questionType: 'open', answer: '作者晚上去看荷塘，写了荷塘的景色很美。' },
        { questionId: 'q3', questionType: 'open', answer: '"月光如流水一般，静静地泻在这一片叶子和花上。"月光像流水一样，这个比喻很特别。' },
        { questionId: 'q4', questionType: 'open', answer: '作者的心情好像比较平静，但又有点孤独。' },
        { questionId: 'q5', questionType: 'open', answer: '"这时候最热闹的，要数树上的蝉声与水里的蛙声；但热闹是它们的，我什么也没有。"这句话是什么意思？' },
        { questionId: 'q6', questionType: 'open', answer: '语言很美，但是有些难理解。' }
      ]
    },
    { responseId: 'r3', surveyId: 'demo-001', studentName: '王大伟', studentClass: '高一(2)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', answer: '读过一两篇' },
        { questionId: 'q2', questionType: 'open', answer: '文章写了作者在一个月夜去荷塘散步的经历，描写了荷塘上的月色和周围的景色，同时表达了作者内心的不宁静和对自由的向往。' },
        { questionId: 'q3', questionType: 'open', answer: '我最喜欢描写荷塘月色的那一段，把荷叶、荷花、月光都写得非常细腻，让人仿佛身临其境。特别是"微风过处，送来缕缕清香"这个嗅觉描写，很有代入感。' },
        { questionId: 'q4', questionType: 'open', answer: '作者内心是矛盾的，既有对现实的不满，又想通过欣赏自然美景来排遣。他虽然被荷塘月色暂时吸引，但内心的烦恼并没有真正消失。' },
        { questionId: 'q5', questionType: 'open', answer: '1. 为什么作者要用大量篇幅写荷塘景色，和他"不宁静"的心情有什么关系？ 2. 文章的写作背景是什么？ 3. "采莲赋"那段有什么作用？' },
        { questionId: 'q6', questionType: 'open', answer: '情景交融写得特别好，景中有情，情中有景。语言也很有特色，清新自然。' }
      ]
    },
    { responseId: 'r4', surveyId: 'demo-001', studentName: '陈思雨', studentClass: '高一(3)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', answer: '读过很多篇' },
        { questionId: 'q2', questionType: 'open', answer: '这篇散文以"心里颇不宁静"为开头，写作者夜游荷塘的所见所感。通过对荷塘月色的细腻描写，表达了作者对现实的不满和对自由宁静生活的向往，最后又回到现实的无奈中。' },
        { questionId: 'q3', questionType: 'open', answer: '"曲曲折折的荷塘上面，弥望的是田田的叶子。叶子出水很高，像亭亭的舞女的裙。"一连串的比喻非常精彩，把静态的荷叶写活了。还有"月光如流水一般，静静地泻在这一片叶子和花上"的"泻"字用得特别妙。' },
        { questionId: 'q4', questionType: 'open', answer: '作者的心情经历了"不宁静—寻求宁静—暂时宁静—重归不宁静"的变化过程。荷塘月色是他暂时逃避现实的地方，但最终还是要回到现实中。' },
        { questionId: 'q5', questionType: 'open', answer: '1. 文章的时代背景对理解作者心情有多重要？ 2. 为什么作者想起的是江南的采莲，而不是别的？ 3. 本文的"文眼"是什么？' },
        { questionId: 'q6', questionType: 'open', answer: '朱自清的散文语言非常有特色，清新典雅又不失自然。特别是通感手法的运用，让人耳目一新。' }
      ]
    },
    { responseId: 'r5', surveyId: 'demo-001', studentName: '赵子涵', studentClass: '高一(3)班', submittedAt: new Date().toISOString(),
      answers: [
        { questionId: 'q1', questionType: 'choice', answer: '读过一两篇' },
        { questionId: 'q2', questionType: 'open', answer: '作者晚上去荷塘散步，看到了美丽的荷塘景色，心情好了一些，但后来又不好了。' },
        { questionId: 'q3', questionType: 'open', answer: '描写荷花的那几句写得特别美，"袅娜""羞涩"把花写得像人一样。' },
        { questionId: 'q4', questionType: 'open', answer: '作者一开始心情不好，后来看到美景心情好了。' },
        { questionId: 'q5', questionType: 'open', answer: '"梵婀玲"是什么？还有"蓊蓊郁郁"怎么读？' },
        { questionId: 'q6', questionType: 'open', answer: '景色描写很美，但是有些地方读不太懂。' }
      ]
    }
  ];

  writeResponses('demo-001', demoResponses);
  console.log('演示数据已初始化');
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  ensureDataDir();
  initDemoData();

  if (req.method === 'GET') {
    try {
      const surveys = readSurveys();
      const result = surveys.map(s => ({
        ...s,
        responseCount: readResponses(s.id).length
      }));
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const surveys = readSurveys();
      const newSurvey = {
        id: generateId('survey'),
        createdAt: new Date().toISOString(),
        status: 'draft',
        ...req.body
      };
      surveys.unshift(newSurvey);
      writeSurveys(surveys);
      return res.json(newSurvey);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
