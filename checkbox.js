var Prompt = require('inquirer-checkbox-plus-prompt');
var observe = require('inquirer/lib/utils/events');
var cliCursor = require('cli-cursor');
var chalk = require('chalk');
var _ = require('lodash');

var figures = require('figures');
var Choices = require('inquirer/lib/objects/choices');

class CheckBoxPlusPrompt extends Prompt {

    constructor(questions, rl, answers) {
        super(questions, rl, answers);
        this.backspace = false;
        this.cacheQuery = '';
        this.firstRender = true;
        this.opt = _.defaults(_.clone(this.opt), { answer: val => val });
        var header = this.opt.header;
        var footer = this.opt.footer;
        if (header && !_.isString(header)) {
            throw new Error('CheckBoxPlus Param head must be a string');
        }
        if (footer && !_.isString(footer)) {
            throw new Error('CheckBoxPlus Param footer must be a string');
        }
    }

    /**
     * @overwrite
     */
    _run(callback) {

        var self = this;

        this.events = observe(this.rl);

        this.done = callback;

        this.executeSource().then(function (result) {

            var events = self.events = observe(self.rl)

            // add 
            // crrl/alt + q 全选
            events.AllKey = events.keypress.filter(({ key }) =>
                key.name === 'a' && (key.ctrl || key.meta)
            ).share()

            // add 
            // crrl/alt + i 反选
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
                events.keypress
                    // add 过滤掉 backsapce 以便缓存 input
                    .do(({ key }) => { if (key && key.name === 'backspace') { self.backspace = true; } })
                    .takeUntil(validation.success).forEach(self.onKeypress.bind(self));

                // add ctrl + a / alt + a / ctrl + i/ alt + i
                events.AllKey.takeUntil(validation.success).forEach(self.onAllKey.bind(self));
                events.InverseKey.takeUntil(validation.success).forEach(self.onInverseKey.bind(self));
            }

            if (self.rl.line) {
                self.onKeypress();
            }

            // Init the prompt
            cliCursor.hide();
            self.render();
            self.firstRender = false;

        });

        return this;

    }

    renderChoices(choices, pointer) {

        var self = this;
        var output = '';
        var separatorOffset = 0;
        var highlight = this.opt.highlight;

        // Foreach choice
        choices.forEach(function (choice, index) {

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
                if (!highlight) {
                    output += choice.name;
                } else {
                    output += highlight && (_.isFunction(highlight) ? highlight(choice.name) : chalk.cyan(choice.name));
                }
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
            var selection = this.opt.answer(this.selection);

            selection = _.isArray(selection) ? selection.join(', ') : selection;

            message += chalk.cyan(selection);

            return this.screen.render(message, bottomContent);

        }

        // No search query is entered before

        // If the search is enabled
        if (this.opt.searchable && this.firstRender) {

            message += this.opt.header
                ? this.opt.header
                : (
                    '(Press ' +
                    chalk.cyan.bold('<space>') +
                    ' to select, ' +
                    'or type anything to filter the list)'
                );

        } else if (!this.opt.searchable) {

            message +=
                '(Press ' +
                chalk.cyan.bold('<space>') +
                ' to select, ' +
                chalk.cyan.bold('<a>') +
                ' to toggle all, ' +
                chalk.cyan.bold('<i>') +
                ' to invert selection)';

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
            // add 
            var realChoiceStr = this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize);
            var lastLine = realChoiceStr.substring(realChoiceStr.lastIndexOf('\n') + 1);
            choicesStr = realChoiceStr.substring(0, realChoiceStr.lastIndexOf('\n') + 1);
            realChoiceStr = this.opt.footer ? (choicesStr + '\n' + this.opt.footer) : realChoiceStr;
            message += '\n' + realChoiceStr;

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
                // add
                if (choice.checked) {
                    checkedChoices.push(choice);
                }
            }
        });

        var choices = this.choices.choices;
        // add 
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
            // add 
            if (shouldBeChecked) {
                checkedChoices.push(choice);
            }
        });

        // add 
        !shouldBeChecked && (this.checkedChoices = []);

        this.render();

    }

    onKeypress({ key }) {
        // add 
        if (key && key.name !== 'backspace') {
            this.cacheQuery = this.rl.line;
        }
        super.onKeypress();
    }

    executeSource() {

        var self = this;
        var sourcePromise = null;

        // Remove spaces
        this.rl.line = _.trim(this.rl.line);

        // add 
        if (this.rl.line === this.lastQuery && !this.filterSearch) {
            return;
        }


        if (this.opt.searchable) {
            // add 
            sourcePromise = this.opt.source(this.answers, this.backspace ? this.cacheQuery : this.rl.line);
        } else {
            sourcePromise = this.opt.source(this.answers, null);
        }

        this.lastQuery = this.rl.line;
        this.lastSourcePromise = sourcePromise;
        this.searching = true;

        sourcePromise.then(function (choices) {

            // Is not the last issued promise
            if (self.lastSourcePromise !== sourcePromise) {
                return;
            }

            // Reset the searching status
            self.searching = false;

            // Save the new choices
            self.choices = new Choices(choices, self.answers);

            // Foreach choice
            self.choices.forEach(function (choice) {

                // Is the current choice included in the current checked choices
                if (_.findIndex(self.value, _.isEqual.bind(null, choice.value)) != -1) {
                    self.toggleChoice(choice, true);
                } else {
                    self.toggleChoice(choice, false);
                }

                // The default is not applied yet
                if (self.default) {

                    // Is the current choice included in the default values
                    if (_.findIndex(self.default, _.isEqual.bind(null, choice.value)) != -1) {
                        self.toggleChoice(choice, true);
                    }

                }

            });

            // Reset the pointer to select the first choice
            self.pointer = 0;
            self.render();
            self.default = null;
            self.firstSourceLoading = false;

        });

        return sourcePromise;

    }

    // add
    toggleSearch() {
        this.filterSearch = !this.filterSearch;
    }

    // add 
    // 监听  ctrl + q 事件
    listenSearch(music) {
        var self = this;
        this.events.keypress
            .filter(({ key }) => key.name === 'q' && (key.meta || key.ctrl))
            .share()
            .forEach((x) => {
                music.switchSource();
                self.toggleSearch();
                self.onKeypress(x)
                self.toggleSearch();
            })
    }
}

module.exports = CheckBoxPlusPrompt;




