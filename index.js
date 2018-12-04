'use strict';

var Songs = require('./songs');
var Player = require('./player');
var Music = require('./music');
var Event = require('./event');

var chalk = require('chalk');
var figures = require('figures');
var inquirer = require('inquirer');
inquirer.registerPrompt('checkbox-plus', require('./checkbox'));

var R = require('ramda');

var { filter, takeUntil, share } = require('rxjs/operators')

class Inquirer {

    constructor(music) {
        this.inquirer = inquirer;
        this.defaultInput = '周杰伦';
        this.checkBoxPlusParam = {
            type: 'checkbox-plus',
            name: 'song',
            highlight: chalk.cyan,
            message: '搜索你想要歌曲?',
            searchable: true,
            enablebackspace: true,
            source: this.feachSongs.bind(this),
            answer: this.handleSelection.bind(this),
            footer: this.footer.bind(this),
            header: this.header.bind(this),
            keypress: this.keypress.bind(this),
            searching: this.searching.bind(this),
            noresult: this.noresult.bind(this),
        }
        this.params = [this.checkBoxPlusParam];
        this.music = music;
        this.songs;
    }

    prompt() {
        // prompt 会给 promsie设置一个 ui 对象， activePrompt为当前响应的 prompt
        var promise = this.inquirer.prompt(this.params)
        return promise
            .then(R.path(['song']))
    }

    feachSongs(answer, input = '') {
        var self = this;
        var music = this.music;
        return Promise
            .resolve(music.search.call(music, input || this.defaultInput))
            .then(msg => {

                // 超时
                if (msg.status === false) {
                    return [];
                }

                // 拼凑 构造参数
                var args = R.pipe(
                    R.path(['data', 'songs']),
                    R.map(R.pick(['id', 'name', 'album', 'artists', ])),
                    R.map(R.evolve({
                        album: R.prop('name'),
                        artists: R.pipe(R.pluck('name'), R.join('/'))
                    })),
                    R.map(R.values),
                )(msg)


                if (self.songs) {
                    self.songs.clear();
                    self.songs.add(args);
                } else {
                    self.songs = new Songs(args);
                }
                return self.songs.getSelection();

            })
            .catch(()=>[])
    }

    validate() {}

    header() {
        return `<${chalk.white("ctrl+q")}> 切换搜索引擎 <${chalk.white("space")}> 选中`;
    }

    footer() {
        return ` ${figures.pointer}${figures.pointer} 按${chalk.white(figures.arrowUp)} ${chalk.white(figures.arrowDown)} 键移动`;
    }

    searching() {
        return '正在努力搜索中...'
    }

    noresult() {
        return '未找到任何结果...'
    }


    handleSelection(selection) {
        return selection.length > 3 ? selection.slice(0, 3) + '....' : selection;
    }


    parseUrls(urlInfo) {
        return this.music.parseUrls(urlInfo);
    }

    keypress(events, validation, prompt) {
        var music = this.music;

        events.AllKey = events.keypress
            .pipe(
                filter(({key}) => key.name === 'a' && (key.ctrl || key.meta)),
                share(),
            )

        events.InverseKey = events.keypress
            .pipe(
                filter(({key}) => key.name === 'i' && (key.ctrl || key.meta)),
                share(),
            )

        events.SearchKey = events.keypress
            .pipe(
                filter(({key}) => key.name === 'q' && (key.ctrl || key.meta)),
                share(),
            )

        events.AllKey
            .pipe(takeUntil(validation.success))
            .forEach(prompt.onAllKey.bind(prompt));

        events.InverseKey
            .pipe(takeUntil(validation.success))
            .forEach(prompt.onInverseKey.bind(prompt));

        events.SearchKey
            .pipe(takeUntil(validation.success))
            .forEach((x) => {
                music.switchSource();
                prompt.toggleSearch();
                prompt.checkedChoices.length = 0;
                prompt.onKeypress(x)
                prompt.toggleSearch();
            })

    }

}

(async() => {

    var music = new Music();

    var msg = await music.search();

    var inquirer = new Inquirer(music);

    var ids = await inquirer.prompt();

    var urlInfo = await Promise.all(R.map(id => music.getRealUrl(id).catch(() => false), ids));

    var urls = inquirer.parseUrls(urlInfo);

    var player = new Player(urls);

    player.play() && new Event(player).listenKeyPress();

    player.on('error', err => {
        if (err.code === 'ETIMEDOUT') {
            console.log('timeout');
            return;
        }
        console.error(err)
    })

})().catch(console.error)


process.on('uncaughtException', (err) => {
    console.error(err);
})