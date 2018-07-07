var Base = require('inquirer-checkbox-plus')

class CheckBoxPlus extends Base {

    constructor(questions, rl, answers) {
        super(questions, rl, answers);
    }
}

module.exports = CheckBoxPlus;