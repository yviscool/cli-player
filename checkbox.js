var Prompt = require('inquirer-checkbox-plus-prompt');
var observe = require('inquirer/lib/utils/events');
var cliCursor = require('cli-cursor');
var chalk = require('chalk');
var _ = require('lodash');

var figures = require('figures');

class CheckBoxPlusPrompt extends Prompt {

    constructor(questions, rl, answers) {
        super(questions, rl, answers);
    }

    /**
     * @overwrite
     */
    _run(callback) {

        var self = this;

        this.done = callback;

        this.executeSource().then(function (result) {

            var events = observe(self.rl);

            events.AllKey = events.keypress.filter(({ key }) =>
                key.name === 'a' && (key.ctrl || key.meta)
            ).share()

            events.InverseKey = events.keypress.filter(({ key }) =>
                key.name === 'i' && (key.ctrl || key.meta)
            ).share()


            var validation = self.handleSubmitEvents(
                events.line.map(self.getCurrentValue.bind(self))
            );

            validation.success.forEach(self.onEnd.bind(self));
            validation.error.forEach(self.onError.bind(self));

            events.normalizedUpKey.takeUntil(validation.success).forEach(self.onUpKey.bind(self));
            events.normalizedDownKey.takeUntil(validation.success).forEach(self.onDownKey.bind(self));
            events.spaceKey.takeUntil(validation.success).forEach(self.onSpaceKey.bind(self));

            // If the search is enabled
            if (!self.opt.searchable) {

                events.numberKey.takeUntil(validation.success).forEach(self.onNumberKey.bind(self));
                events.aKey.takeUntil(validation.success).forEach(self.onAllKey.bind(self));
                events.iKey.takeUntil(validation.success).forEach(self.onInverseKey.bind(self));

            } else {
                events.keypress.takeUntil(validation.success).forEach(self.onKeypress.bind(self));

                events.AllKey.takeUntil(validation.success).forEach(self.onAllKey.bind(self));
                events.InverseKey.takeUntil(validation.success).forEach(self.onInverseKey.bind(self));
            }

            if (self.rl.line) {
                self.onKeypress();
            }

            // Init the prompt
            cliCursor.hide();
            self.render();

        });

        return this;

    }

    renderChoices(choices, pointer) {

        var self = this;
        var output = '';
        var separatorOffset = 0;
    
        // Foreach choice
        choices.forEach(function(choice, index) {
    
          // Is a separator
          if (choice.type === 'separator') {
    
            separatorOffset++;
            output += ' ' + choice + '\n';
            return;
    
          }
    
          // Is the choice disabled
          if (choice.disabled) {
    
            separatorOffset++;
            output += ' - ' + choice.name;
            output += ' (' + (_.isString(choice.disabled) ? choice.disabled : 'Disabled') + ')';
            output += '\n';
            return;
    
          }
    
          // Is the current choice is the selected choice
          if (index - separatorOffset === pointer) {
    
            output += chalk.cyan(figures.pointer);
            output += self.getCheckboxFigure(choice.checked) + ' ';
            output += self.opt.highlight ? chalk.blue(choice.name) : choice.name;
    
          } else {
    
            output += ' ' + self.getCheckboxFigure(choice.checked) + ' ' + choice.name;
    
          }
    
          output += '\n';
    
    
        });
    
        return output.replace(/\n$/, '');
    
      }


    /**
     * Render the prompt
     * 
     * @overwrite 
     */
    render(error) {

        // Render question
        var message = this.getQuestion();
        var bottomContent = '';

        // Answered
        if (this.status === 'answered') {

            // add 
            var selection = this.selection.map(selection => {
                return selection.substring(0, selection.lastIndexOf(' ')).trim();
            })

            message += chalk.cyan(selection.join(', '));
            return this.screen.render(message, bottomContent);

        }

        // No search query is entered before
        if (this.firstSourceLoading) {

            // If the search is enabled
            if (this.opt.searchable) {

                message +=
                    '(Press ' +
                    chalk.cyan.bold('<space>') +
                    ' to select, ' +
                    'or type anything to filter the list)';

            } else {

                message +=
                    '(Press ' +
                    chalk.cyan.bold('<space>') +
                    ' to select, ' +
                    chalk.cyan.bold('<a>') +
                    ' to toggle all, ' +
                    chalk.cyan.bold('<i>') +
                    ' to invert selection)';

            }

        }

        // If the search is enabled
        if (this.opt.searchable) {

            // Print the current search query
            message += this.rl.line;

        }

        // Searching mode
        if (this.searching) {

            message += '\n  ' + chalk.cyan('Searching...');

            // No choices
        } else if (!this.choices.length) {

            message += '\n  ' + chalk.yellow('No results...');

            // Has choices
        } else {

            var choicesStr = this.renderChoices(this.choices, this.pointer);

            var indexPosition = this.choices.indexOf(
                this.choices.getChoice(this.pointer)
            );

            message += '\n' + this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize);

        }

        if (error) {
            bottomContent = chalk.red('>> ') + error;
        }

        this.screen.render(message, bottomContent);

    }

    /**
     *  @overwrite
     */
    onInverseKey() {

        var checkedChoices = this.checkedChoices;

        this.choices.forEach(function (choice) {
            if (choice.type !== 'separator') {
                choice.checked = !choice.checked;
                if (choice.checked) {
                    checkedChoices.push(choice);
                }
            }
        });

        var choices = this.choices.choices;

        choices[0] && !choices[0].checked && (this.checkedChoices = []);

        this.render();

    }

    /**
     *  @overwrite 
     */
    onAllKey() {


        var checkedChoices = this.checkedChoices;

        var shouldBeChecked = Boolean(
            this.choices.find(function (choice) {
                return choice.type !== 'separator' && !choice.checked;
            })
        );
        this.choices.forEach(function (choice) {
            if (choice.type !== 'separator') {
                choice.checked = shouldBeChecked;
            }
            if (shouldBeChecked) {
                checkedChoices.push(choice);
            }
        });

        !shouldBeChecked && (this.checkedChoices = []);

        this.render();

    }


}

module.exports = CheckBoxPlusPrompt;