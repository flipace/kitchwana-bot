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
  const mondaySchedule = later.parse.text('every monday at 9:00 am');
  later.setInterval(mondayReminder, mondaySchedule);

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

  robot.respond(/who(.*)kitchen(.*)duty/i, function (res) {
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
