const fs = require('fs');
const inquirer = require('inquirer');
const { add, assoc, filter, has, map, pluck, propOr, reduce, reject, times } = require('ramda');
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
    const [num, size] = map(parseInt, table['roll'].split('d'));
    const roll = manyDice(num, size) + propOr(0, table.modifier, answers);
    for (let r of table.result) {
      for (let k in r) {
        const [min, max] = map(parseInt, k.split('-'));
        if (roll >= min && roll <= max) {
          newAnswers = assoc(table.table, r[k], newAnswers);
        }
      }
    }
  }
  console.log(yaml.safeDump(newAnswers));
  return newAnswers;
}

async function processScript() {
  let answers = {};
  const questions = filter(isPrompt, script);
  if (questions) {
    answers = await inquirer.prompt(pluck('question', questions));
  }
  const newAnswers = times(() => buildResults(answers), parseInt(program.count) || 1);
  // return newAnswers;
  return "Done";
}

processScript()
  .then(console.log)
  .catch(console.error)