// Description:
//   Provides various features to make kitchen duty great again.
// Commands:
//   hubot assign @name1 @name2 [@namex] - assigns the mentioned users to kitchen duty
//   hubot who [kitchen [duty]] - responds with assigned kitchen duty users
//   hubot help with kitchen [duty] - will try to help with kitchen duty
// Notes:
//   hubot will reset and remind you to assign new kitchen duty every monday at 9 am.
//   She's going to ask random users at 1pm, 2pm, 4pm and 4:30pm every workday whether the kitchen is clean and nice.
// Author:
//   flipace
const later = require('later');

const emptyData = {
  people: []
};

const SAVE_KEY = 'kitchenDutyData';

function getData(brain) {
  const data = brain.get(SAVE_KEY);

  return data ? JSON.parse(data) : emptyData;
}

function setData(data, brain) {
  brain.set(SAVE_KEY, JSON.stringify(data));
}

module.exports = function (robot) {
  console.log(`Started Kitchwana at ${Date.now()}`);

  const mondaySchedule = later.parse.text('at 9:00 am on Monday');
  later.setInterval(mondayReminder, mondaySchedule);

  const mondayScheduleS = later.schedule(mondaySchedule).next(10);
  console.log(`Monday Schedule: `, mondayScheduleS);

  const kitchenHappinessSchedule = later.parse.text('at 1:00 pm also at 2:00 pm also at 4:00 pm also at 4:30 pm on Monday, Tuesday, Wednesday, Thursday and Friday');
  later.setInterval(askPeopleAboutKitchenHappiness, kitchenHappinessSchedule);
  //later.setInterval(askPeopleAboutKitchenHappiness, later.parse.text('every 10 seconds'));

  const scheduleHappinessS = later.schedule(kitchenHappinessSchedule).next(10);
  console.log(`Happiness Schedule: `, scheduleHappinessS);

  const reminderSchedule = later.parse.text('at 3:00 pm on Monday, Tuesday, Wednesday, Thursday and Friday');
  later.setInterval(reminder, reminderSchedule);

  const scheduleReminderS = later.schedule(reminderSchedule).next(10);
  console.log(`Reminder Schedule: `, scheduleReminderS);

  function reminder() {
    // @TODO remind the assigned people to fullfill their duty
  }

  function mondayReminder() {
    // first, clean up previous kitchen duty people!
    const data = getData(robot.brain);

    data.history.push(data.people);
    data.people = [];

    setData(data, robot.brain);

    console.log(Date.now(), "MONDAY REMINDER!");

    const publicId = '528892_ovos@conf.hipchat.com';

    const mondayMessages = [
      `Good morning everyone! You should assign kitchen duty ASAP to keep me happy!`,
      `I hope you all had a nice weekend, let's kickstart the week with a nice monday morning meeting and the most important decision of all: Who's in for kitchen duty?`,
      `Welcome back from the weekend! I'm awaiting kitchen duty assignees as soon as possible!`
    ];

    robot.messageRoom(publicId, mondayMessages[(Math.random() * mondayMessages.length + 1)]);
  }

  function askPeopleAboutKitchenHappiness(retry) {
    const data = getData(robot.brain);

    console.log(`Asking about kitchen happiness at ${Date.now()} - Retry: ${typeof retry !== 'undefined' ? retry.toString() : 'no'}`);

    if (typeof data.happinessAskedHistory === 'undefined') {
      data.askedHistory = [];
    }

    const lastAsked = data.askedHistory.length ? data.askedHistory[data.askedHistory.length - 1] : {};

    // we don't want to ask the same person twice in a row, so we filter out this user
    const kitchenOfficers = [
      '4573595',
      '3675983',
      '3675949',
      '3666225',
      '3666223',
      '3666201',
      '3665134',
      '3665132',
      '3665125',
      '3629678',
      '3495325',
      '3495219',
      '3495226'
    ].filter(officer => officer !== lastAsked.userId);

    const randomOfficerIndex = Math.floor((Math.random() * kitchenOfficers.length));

    const randomOfficer = kitchenOfficers[randomOfficerIndex];
    const userData = robot.brain.data.users[randomOfficer];

    const messages = [
      `hi ${userData.name}, could you let me know whether you like the way the kitchen looks at the moment? Just answer with Yes or No (or some variant) to let me know!`,
      `${userData.name}! What's up? Do you think the kitchen is clean enough at the moment? Just answer with yes or no to let me know!`,
      `Yes - or no. One of them is the answer to: Are the kitchen duty people fullfilling their role responsibly? What do you think ${userData.name} (answer with yes or no)?`,
      `Hi ${userData.name}, does the kitchen look fine? Yes or No?`
    ];

    const randomMessageIndex = Math.floor((Math.random() * messages.length));
    const randomMessage = messages[randomMessageIndex];

    if (userData) {
      // robot.messageRoom('528892_3495226@chat.hipchat.com', randomMessage);
      robot.messageRoom(userData.jid, randomMessage);

      data.askedHistory.push({ userId: randomOfficer, jid: userData.jid, answered: false, timestamp: Date.now() });

      setData(data, robot.brain);
    } else {
      // try again
      askPeopleAboutKitchenHappiness(true);
    }
  }

  robot.respond(/yes|yeah|sure|yep|yup|y|fine|accepted|perfect|stunning|awesome|beautiful|rock|totally|dope/i, function (res) {
    if (res.envelope.message.text.indexOf('no') > -1) {
      res.send(`You're trying to confuse me. Please answer with yes or no. Not both.`);
      return;
    }

    const data = getData(robot.brain);

    if (typeof data.askedHistory === 'undefined') data.askedHistory = [];

    if (data.askedHistory) {
      const descHistory = data.askedHistory.slice().reverse();
      const lastAsked = descHistory.find(history => history.jid === res.envelope.user.reply_to);

      if (lastAsked && !lastAsked.answered) {
        const answerTime = Date.now();

        // if you reply after 4 hours, we won't accept the answer
        if (answerTime - lastAsked.timestamp > (1000 * 60 * 60 * 4)) {
          res.send(`Sorry, but your response came too late. I can't accept answers 4 hours after I asked the one and only question which matters.`)
          return;
        }

        const index = data.askedHistory.findIndex(history => history.timestamp === lastAsked.timestamp);

        data.askedHistory[index].answered = true;
        data.askedHistory[index].answer = 'positive';

        setData(data, robot.brain);

        res.send(`Thanks for your answer! I'll keep it in mind when I decide about giving or taking karma!`);
      } else {
        res.send(`No.`);
      }
    } else {
      res.send(`Sorry, I don't understand that...`);
    }
  });

  // yes, i know i'm repeating myself but i'm TIRED
  robot.respond(/no|nope|horrible|bad|not|dirty|niet|nada/i, function (res) {
    if (res.envelope.message.text.indexOf('yes') > -1) {
      res.send(`You're trying to confuse me. Please answer with yes or no. Not both.`);
      return;
    }

    const data = getData(robot.brain);

    if (typeof data.askedHistory === 'undefined') data.askedHistory = [];

    if (data.askedHistory) {
      const descHistory = data.askedHistory.slice().reverse();
      const lastAsked = descHistory.find(history => history.jid === res.envelope.user.reply_to);

      if (lastAsked && !lastAsked.answered) {
        const answerTime = Date.now();

        // if you reply after 4 hours, we won't accept the answer
        if (answerTime - lastAsked.timestamp > (1000 * 60 * 60 * 4)) {
          res.send(`Sorry, but your response came too late. I can't accept answers 4 hours after I asked the one and only question which matters.`)
          return;
        }

        const index = data.askedHistory.findIndex(history => history.timestamp === lastAsked.timestamp);

        data.askedHistory[index].answered = true;
        data.askedHistory[index].answer = 'negative';

        setData(data, robot.brain);

        res.send(`Thanks for your answer! To bad that kitchen service is not as great as it could be. But fear not my friend. Together we make kitchen service great again.`);
      } else {
        res.send(`Yes.`);
      }
    } else {
      res.send(`Sorry, I don't understand that...`);
    }
  });

  robot.respond(/who((.*)kitchen(.*)duty)?/i, function (res) {
    const data = getData(robot.brain);

    if (data.people.length) {
      const verb = data.people.length > 1 ? 'are' : 'is';
      const reply = `${data.people.join(' and ')} ${verb} currently responsible for a CLEAN and NICE kitchen!`;
      res.reply(reply);
    } else {
      const randomEmpty = [
        `WHAT IS THIS? NO ONE ASSIGNED FOR KITCHEN DUTY? I DO NOT APPROVE OF THIS SLACKERY.`,
        `No one is assigned for kitchen duty. Cockroaches unite.`,
        `Every minute without someone assigned for kitchen duty, my anger increases. YOU DO NOT WANT MY ANGER TO INCREASE.`,
        `It seems like no one signed up for kitchen duty yet.`
      ];

      res.send(res.random(randomEmpty));
    }
  });

  robot.respond(/help with kitchen\s?(duty)?/i, function(res) {
    res.reply(`i'm sorry, i'm not yet capable of this, but @Milan is doing great progress with this feature. i can already move: https://s3.amazonaws.com/uploads.hipchat.com/528892/3495325/KQ8jcWEdSccwtI1/vtbp6dtoswifwrmutue3.gif`);
  });

  robot.respond(/assign(.*)(kitchen duty)?/i, function (res) {
    const match1 = res.match[0].match(/(@\w*)\s?/ig);
    const names = match1 ? match1.map(n => n.trim()) : [];

    if (names.length <= 0) {
      res.reply(`I'm sorry, I couldn't understand this. Please mention people like: "@Kitchwana, assign @Patrick and @Florentin for kitchen duty." (There's no limit for people ;))`);
      return;
    }

    const data = getData(robot.brain);

    data.people = names;

    setData(data, robot.brain);

    const verb = names.length > 1 ? 'have' : 'has';

    const randomAssigned = [
      `Alright, I assigned ${names.join(' and ')} for kitchen duty. May the towel be with them.`,
      `${names.join(' and ')} ${verb} been successfully assigned for the honorable kitchen duty.`,
      `I'm watching you ${names.join(' and ')} since you have been given the kitchen duty task.`,
      `${names.join(' and ')} ${verb} been assigned for kitchen duty. That is all.`,
      `${names.join(' and ')} - you finally found meaning in your life, you shall do the kitchen.`,
      `${names.join(' and ')} ${verb} been assigned for kitchen duty.`
    ]

    res.send(res.random(randomAssigned));
  });
}
