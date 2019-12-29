const fs = require('fs');
const inquirer = require('inquirer');
const { add, assoc, filter, has, map, omit, pluck, propOr, reduce, reject, times } = require('ramda');
const yaml = require('js-yaml');

const program = require('commander');

var script

program
  .version('0.1.0')
  .option('-c, --count <count>')
  .arguments('<sourceFile>')
  .action((sourceFile) => {
    try {
      const data = fs.readFileSync(sourceFile);
      script = yaml.safeLoad(data.toString());  
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });
program.parse(process.argv);

if (!script) {
  console.error("No script specified");
  process.exit(1);
}

// Return a roll between 1 and (size) on a single die
const oneDie = (size) => Math.floor(Math.random() * size + 1);

// Return a roll of (num)d(size)
const manyDice = (num, size) => reduce(add, 0, times(() => oneDie(size), num));

const isPrompt = has('question');

function buildResults(answers) {
  var newAnswers = answers;
  const tables = reject(isPrompt, script);
  for (let table of tables) {
    var ifCondition = true
    if (table.if) {
      ifCondition = false
      if(newAnswers[table.if.key] == table.if.value) {
        ifCondition = true
      }
    }
    if (ifCondition) {
      const [num, size] = map(parseInt, table['roll'].split('d'));
      const roll = manyDice(num, size) + propOr(0, table.modifier, answers);
      for (let r in table.result) {
        let [min, max] = map(parseInt, r.split('-'));
        if (!max) {
          max = min
        }
        if (roll >= min && roll <= max) {
          newAnswers = assoc(table.table, table.result[r], newAnswers);
        }
      }  
    }
  }
  const omitKeys = pluck('omit', script);
  newAnswers = omit(omitKeys, newAnswers);
  console.log(yaml.safeDump(newAnswers));
  return newAnswers;
}

async function processScript() {
  let answers = {};
  const questions = filter(isPrompt, script);
  if (questions) {
    answers = await inquirer.prompt(pluck('question', questions));
  }
  times(() => buildResults(answers), parseInt(program.count) || 1);
  return "Done";
}

processScript()
  .then(console.log)
  .catch(console.error)